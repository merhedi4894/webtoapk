import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve the database path - support both local and Docker environments
function getDatabaseUrl(): string {
  // Priority 1: Use DATABASE_URL env var if set (with absolute path)
  const envUrl = process.env.DATABASE_URL
  if (envUrl && envUrl.startsWith('file:') && !envUrl.includes('./')) {
    // Already an absolute path in env
    return envUrl
  }

  // Priority 2: Construct absolute path from cwd
  const dbDir = path.join(process.cwd(), 'db')
  const dbPath = path.join(dbDir, 'custom.db')

  // Ensure the db directory exists
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true })
      console.log(`[DB] Created database directory: ${dbDir}`)
    } catch (err: any) {
      console.error(`[DB] Failed to create database directory: ${err.message}`)
    }
  }

  return `file:${dbPath}`
}

const databaseUrl = getDatabaseUrl()
console.log(`[DB] Using database URL: ${databaseUrl}`)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: databaseUrl,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
