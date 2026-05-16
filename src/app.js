import cors from 'cors'
import express from 'express'
import authRoutes from './routes/authRoutes.js'
import transactionRoutes from './routes/transactions.js'
import linkedAccountRoutes from './routes/linkedAccounts.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'

export function createApp() {
  const app = express()
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

  app.use(
    cors({
      origin,
      credentials: true,
    }),
  )
  app.use(express.json())

  app.get('/health', (req, res) => res.json({ ok: true }))

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/transactions', transactionRoutes)
  app.use('/api/linked-accounts', linkedAccountRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}