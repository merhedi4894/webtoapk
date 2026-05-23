import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const builds = await db.appBuild.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ builds })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
