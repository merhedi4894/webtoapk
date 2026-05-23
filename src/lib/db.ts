import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitialized: Promise<void> | undefined
}

// Resolve the database path - support both local and Docker environments
function getDatabaseUrl(): string {
  // Priority 1: Use DATABASE_URL env var if set (with absolute path)
  const envUrl = process.env.DATABASE_URL
  if (envUrl && envUrl.startsWith('file:') && !envUrl.includes('./')) {
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

// SQL to create the AppBuild table - exact match of Prisma schema
// This runs directly via Prisma's raw query - NO external commands needed
const CREATE_APPBUILD_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "AppBuild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appName" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "splashText" TEXT NOT NULL DEFAULT '',
    "splashDuration" INTEGER NOT NULL DEFAULT 3000,
    "iconPath" TEXT,
    "orientation" TEXT NOT NULL DEFAULT 'unspecified',
    "themeMode" TEXT NOT NULL DEFAULT 'light',
    "enableNavbar" BOOLEAN NOT NULL DEFAULT true,
    "enablePullRefresh" BOOLEAN NOT NULL DEFAULT false,
    "enableFileAccess" BOOLEAN NOT NULL DEFAULT false,
    "enableCamera" BOOLEAN NOT NULL DEFAULT false,
    "enableLocation" BOOLEAN NOT NULL DEFAULT false,
    "enableStorage" BOOLEAN NOT NULL DEFAULT false,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT false,
    "customUserAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "apkPath" TEXT,
    "buildLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
`

// Create PrismaClient instance
const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: databaseUrl,
  })

// Initialize database - ensure table exists using Prisma's own raw SQL execution
// This is the most reliable approach: no execSync, no npx, no external commands
const dbInitialized = globalForPrisma.dbInitialized ?? (async () => {
  try {
    await prismaClient.$executeRawUnsafe(CREATE_APPBUILD_TABLE_SQL)
    console.log('[DB] AppBuild table verified/created successfully')
  } catch (err: any) {
    // If table already exists, SQLite throws "table already exists" but CREATE IF NOT EXISTS
    // should handle that. Any other error is worth logging.
    if (err.message?.includes('already exists')) {
      console.log('[DB] AppBuild table already exists')
    } else {
      console.error('[DB] Warning: Table creation issue:', err.message)
    }
  }
})()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient
  globalForPrisma.dbInitialized = dbInitialized
}

// Export a wrapper that ensures table exists before any query
export const db = new Proxy(prismaClient, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver)
    // If accessing a model (like appBuild), wrap it to ensure DB is initialized
    if (prop === 'appBuild' && value) {
      return new Proxy(value, {
        get(modelValue, modelProp, modelReceiver) {
          const method = Reflect.get(modelValue, modelProp, modelReceiver)
          if (typeof method === 'function') {
            return async (...args: any[]) => {
              await dbInitialized
              return method.apply(modelValue, args)
            }
          }
          return method
        }
      })
    }
    return value
  }
})
