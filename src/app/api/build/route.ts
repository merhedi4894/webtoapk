import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildApk } from '@/lib/apk-builder'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const appName = formData.get('appName') as string
    const packageName = formData.get('packageName') as string
    const websiteUrl = formData.get('websiteUrl') as string
    const backgroundColor = formData.get('backgroundColor') as string
    const splashText = formData.get('splashText') as string
    const splashDuration = parseInt(formData.get('splashDuration') as string) || 3000
    const orientation = formData.get('orientation') as string
    const themeMode = formData.get('themeMode') as string
    const enableNavbar = formData.get('enableNavbar') === 'true'
    const enablePullRefresh = formData.get('enablePullRefresh') === 'true'
    const enableFileAccess = formData.get('enableFileAccess') === 'true'
    const enableCamera = formData.get('enableCamera') === 'true'
    const enableLocation = formData.get('enableLocation') === 'true'
    const enableStorage = formData.get('enableStorage') === 'true'
    const enableNotifications = formData.get('enableNotifications') === 'true'
    const customUserAgent = formData.get('customUserAgent') as string

    // Validate inputs
    if (!appName?.trim()) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 })
    }
    if (!packageName?.trim()) {
      return NextResponse.json({ error: 'Package name is required' }, { status: 400 })
    }
    if (!websiteUrl?.trim()) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Validate package name format
    const packageRegex = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/
    if (!packageRegex.test(packageName)) {
      return NextResponse.json({ error: 'Invalid package name format (e.g., com.example.myapp)' }, { status: 400 })
    }

    // Handle icon upload
    let iconPath: string | null = null
    const iconFile = formData.get('icon') as File | null
    if (iconFile) {
      const uploadDir = path.join(process.cwd(), 'upload', 'icons')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }
      const iconFileName = `${packageName.replace(/\./g, '_')}_${Date.now()}.png`
      const iconFilePath = path.join(uploadDir, iconFileName)
      const buffer = Buffer.from(await iconFile.arrayBuffer())
      await writeFile(iconFilePath, buffer)
      iconPath = iconFilePath
    }

    // Create build record
    const build = await db.appBuild.create({
      data: {
        appName,
        packageName,
        websiteUrl,
        backgroundColor,
        splashText,
        splashDuration,
        iconPath,
        orientation,
        themeMode,
        enableNavbar,
        enablePullRefresh,
        enableFileAccess,
        enableCamera,
        enableLocation,
        enableStorage,
        enableNotifications,
        customUserAgent,
        status: 'building',
      },
    })

    // Build APK in the background
    try {
      const result = await buildApk({
        id: build.id,
        appName,
        packageName,
        websiteUrl,
        backgroundColor,
        splashText,
        splashDuration,
        iconPath,
        orientation,
        themeMode,
        enableNavbar,
        enablePullRefresh,
        enableFileAccess,
        enableCamera,
        enableLocation,
        enableStorage,
        enableNotifications,
        customUserAgent,
      })

      // Update build record with result
      const updated = await db.appBuild.update({
        where: { id: build.id },
        data: {
          status: 'completed',
          apkPath: result.apkPath,
          buildLog: result.buildLog,
        },
      })

      return NextResponse.json({
        id: updated.id,
        status: 'completed',
        apkPath: result.apkPath,
        buildLog: result.buildLog,
      })
    } catch (buildError: any) {
      await db.appBuild.update({
        where: { id: build.id },
        data: {
          status: 'failed',
          buildLog: buildError.message,
        },
      })
      throw buildError
    }
  } catch (error: any) {
    console.error('Build error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to build APK' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Build ID required' }, { status: 400 })
    }
    await db.appBuild.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
