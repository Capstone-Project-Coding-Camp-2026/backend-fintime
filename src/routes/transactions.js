import { Router } from 'express'
import {
  getTransactions,
  createTransaction,
  getUnlabelledTransactions,
  relabelTransaction,
  relabelBatch,
  getMonthlyAggregation,
} from '../controllers/transactionController.js'
import { authMiddleware } from '../middleware/auth.js'

const r = Router()

r.use(authMiddleware)

r.get('/:userId', getTransactions)
r.post('/', createTransaction)
r.get('/:userId/unlabelled', getUnlabelledTransactions)
r.put('/:transactionId/relabel', relabelTransaction)
r.put('/batch-relabel', relabelBatch)
r.get('/:userId/aggregation', getMonthlyAggregation)

export default r
