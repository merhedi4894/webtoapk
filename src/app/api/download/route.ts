import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile, stat } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Build ID required' }, { status: 400 })
    }

    const build = await db.appBuild.findUnique({ where: { id } })
    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 })
    }
    if (build.status !== 'completed' || !build.apkPath) {
      return NextResponse.json({ error: 'APK not ready' }, { status: 400 })
    }

    const apkPath = build.apkPath
    const fileBuffer = await readFile(apkPath)
    const fileStat = await stat(apkPath)
    const fileName = `${build.appName.replace(/[^a-zA-Z0-9]/g, '_')}_${build.packageName.replace(/\./g, '_')}.apk`

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
