import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

export const connectDB = async () => {
  try {
    await prisma.$connect
    console.log('PostgreSQL connected via Prisma')
  } catch (err) {
    console.error('PostgreSQL connection error:', err)
    process.exit(1)
  }
}

export default prisma