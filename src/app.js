import cors from 'cors'
import express from 'express'
import authRoutes from './routes/authRoutes.js'
import transactionRoutes from './routes/transactions.js'
import linkedAccountRoutes from './routes/linkedAccounts.js'
import aiRoutes from './routes/aiRoutes.js'
import mockRoutes from './routes/mockRoutes.js'
import financeRoutes from './routes/finance.js'
import testRoutes from './routes/testRoutes.js'
import usersRoutes from './routes/users.js'
// import dashboardRoutes from './routes/dashboard.js'
import learningRoutes from './routes/learning.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()
  const originEnv = process.env.CLIENT_ORIGIN || 'http://localhost:5173,https://fintime.up.railway.app'
  
  // Split multiple origins if separated by comma
  const allowedOrigins = originEnv.split(',').map(o => o.trim())

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true)
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
    })
  )
  app.use(express.json())

  app.get('/health', (req, res) => res.json({ ok: true }))

  // Routes Auth
  app.use('/api/auth', authRoutes)

  // Routes Transactions & Users
  app.use('/api/transactions', transactionRoutes)
  app.use('/api/users', usersRoutes)

  // Routes AI & Mock
  app.use('/api/ai', aiRoutes)
  app.use('/api/mock', mockRoutes)

  // Routes Dashboard & Learning
  // app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/learning', learningRoutes)

  // Routes Finance (budget, debt, goal, investment, recurring)
  app.use('/api', financeRoutes)

  // Routes LinkedAccounts
  app.use('/api/linked-accounts', linkedAccountRoutes)

  // Dev/test routes
  app.use('/test', testRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
