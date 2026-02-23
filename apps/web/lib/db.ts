import { PrismaClient } from '../generated/prisma'

// NEON CONNECTION NOTES:
// - DATABASE_URL should point to Neon's *pooled* PgBouncer endpoint (port 6543)
//   and include ?pgbouncer=true&connection_limit=5 to prevent exhausting the
//   connection pool across multiple Vercel serverless function instances.
//   Example: postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech:6543/neondb
//            ?pgbouncer=true&connection_limit=5&sslmode=require
// - DATABASE_URL_UNPOOLED should be the direct connection (port 5432).
//   Use it ONLY for `prisma migrate deploy` in CI — never in the running app.

const createPrismaClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
