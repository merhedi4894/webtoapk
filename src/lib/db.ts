import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

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

// Ensure the database schema exists by running prisma db push
// This is critical for fresh deployments where the database is empty
function ensureDatabaseSchema(dbUrl: string) {
  try {
    console.log('[DB] Ensuring database schema is up-to-date...')
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: dbUrl },
      timeout: 30000,
    })
    console.log('[DB] Database schema is ready')
  } catch (err: any) {
    console.error(`[DB] Warning: Schema push failed: ${err.message}`)
    console.error('[DB] The app will still try to start, but database operations may fail')
  }
}

// Run schema check before creating the client
ensureDatabaseSchema(databaseUrl)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: databaseUrl,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
