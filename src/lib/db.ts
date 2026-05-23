import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use absolute path for SQLite to avoid "unable to open database file" errors
const dbPath = path.join(process.cwd(), 'db', 'custom.db')

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasourceUrl: `file:${dbPath}`,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
