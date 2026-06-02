import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'
import { createTransaction, updateBudgetSpent } from '../controllers/transactionController.js'
import { EXCLUDED_EXPENSE_CATEGORIES } from '../config/utils/constants.js'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories.js'
import { calculateMonthlyAggregation } from '../services/aggregationService.js'
import { runAsyncMockBuilder } from '../controllers/mockController.js'

export { TRANSACTION_CATEGORIES as validCategories }
const router = express.Router()
router.get('/:userId/unlabelled', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ categoryLabel: null }, { categoryLabel: 'lainnya' }, { isLabelled: false }],
      },
      orderBy: { dateTime: 'desc' },
    })
    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
    })
  } catch (error) {
    console.error('Error getting unlabelled transactions:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20, startDate, endDate, category, type } = req.query
    const where = { userId }
    if (startDate || endDate) {
      where.dateTime = {}
      if (startDate) where.dateTime.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setUTCHours(23, 59, 59, 999)
        where.dateTime.lte = end
      }
    }
    if (category) where.categoryLabel = category
    if (type) where.transactionType = type
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { dateTime: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ])
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error getting unlabelled transactions:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
// Get monthly aggregation
router.get('/:userId/monthly', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const { year, month } = req.query
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        dateTime: { gte: startDate, lte: endDate },
      },
    })
    const totalIncome = transactions
      .filter((t) => t.transactionType === 'credit')
      .filter((t) => t.transactionType === 'credit' && !EXCLUDED_EXPENSE_CATEGORIES.includes(t.categoryLabel))
      .reduce((sum, t) => sum + t.amount, 0)
    // Kecualikan topup_ewallet dan transfer_internal
    const totalExpense = transactions
      .filter(
        (t) =>
          t.transactionType === 'debit' &&
          !EXCLUDED_EXPENSE_CATEGORIES.includes(t.categoryLabel),
      )
      .reduce((sum, t) => sum + t.amount, 0)
    const expenseByCategory = {}
    transactions
      .filter((t) => t.transactionType === 'debit' && t.categoryLabel)
      .forEach((t) => {
        if (!expenseByCategory[t.categoryLabel]) {
          expenseByCategory[t.categoryLabel] = 0
        }
        expenseByCategory[t.categoryLabel] += t.amount
      })
    res.json({
      success: true,
      data: {
        month_year: `${year}-${String(month).padStart(2, '0')}`,
        total_income: totalIncome,
        total_expense: totalExpense,
        savings_capacity: totalIncome - totalExpense,
        expense_by_category: expenseByCategory,
        transaction_count: transactions.length,
      },
    })
  } catch (error) {
    console.error('Error getting monthly aggregation:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
// Buat transaksi baru
router.post('/', authMiddleware, createTransaction)
// Relabel a single transaction + save label rule + auto-relabel matching
router.put('/:transactionId/relabel', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params
    const { categoryLabel } = req.body
    const validCategories = TRANSACTION_CATEGORIES
    if (!validCategories.includes(categoryLabel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category label',
      })
    }

    const oldTransaction = await prisma.transaction.findUnique({ where: { id: transactionId } })
    if (!oldTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' })
    }

    // 1. Update transaksi
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryLabel,
        isLabelled: true,
        confidence: 1.0,
      },
    })

    if (oldTransaction.transactionType === 'debit' && oldTransaction.categoryLabel !== categoryLabel) {
      if (oldTransaction.categoryLabel && oldTransaction.categoryLabel !== 'unlabelled') {
        await updateBudgetSpent(oldTransaction.userId, oldTransaction.categoryLabel, -oldTransaction.amount)
      }
      if (categoryLabel && categoryLabel !== 'unlabelled') {
        await updateBudgetSpent(oldTransaction.userId, categoryLabel, oldTransaction.amount)
      }
    }

    // 2. Simpan label rule ke User.labelRules
    const matchKey = (transaction.description || '').toLowerCase().replace(/\s+\d+$/, '').trim()
    let autoRelabelledCount = 0
    if (matchKey && transaction.userId) {
      const user = await prisma.user.findUnique({
        where: { id: transaction.userId },
        select: { labelRules: true },
      })
      if (user) {
        let rules = Array.isArray(user.labelRules) ? [...user.labelRules] : []
        const existingIdx = rules.findIndex((r) => r.match && r.match.toLowerCase() === matchKey)
        if (existingIdx >= 0) {
          rules[existingIdx] = { match: matchKey, category: categoryLabel }
        } else {
          rules.push({ match: matchKey, category: categoryLabel })
        }
        await prisma.user.update({
          where: { id: transaction.userId },
          data: { labelRules: rules },
        })
        // 3. Relabel transaksi unlabelled lainnya yang cocok
        const matchingTx = await prisma.transaction.findMany({
          where: {
            userId: transaction.userId,
            id: { not: transactionId },
            OR: [{ isLabelled: false }, { categoryLabel: null }, { categoryLabel: 'lainnya' }],
            description: {
              contains: matchKey,
              mode: 'insensitive',
            },
          },
        })
        if (matchingTx.length > 0) {
          const result = await prisma.transaction.updateMany({
            where: { id: { in: matchingTx.map((t) => t.id) } },
            data: {
              categoryLabel,
              confidence: 1.0,
              isLabelled: true,
            },
          })

          for (const tx of matchingTx) {
            if (tx.transactionType === 'debit' && tx.categoryLabel !== categoryLabel) {
              if (tx.categoryLabel && tx.categoryLabel !== 'unlabelled') {
                await updateBudgetSpent(tx.userId, tx.categoryLabel, -tx.amount)
              }
              if (categoryLabel && categoryLabel !== 'unlabelled') {
                await updateBudgetSpent(tx.userId, categoryLabel, tx.amount)
              }
            }
          }

          autoRelabelledCount = result.count
        }
      }
    }
    // Trigger hitung ulang aggregation bulan transaksi tersebut
    try {
      const txDate = transaction.dateTime
      const txYear = txDate.getFullYear()
      const txMonth = txDate.getMonth() + 1
      await calculateMonthlyAggregation(transaction.userId, txYear, txMonth)
    } catch (aggErr) {
      console.warn('[RELABEL] Aggregation recalculate gagal:', aggErr.message)
    }
    res.json({
      success: true,
      message: 'Transaction relabelled successfully',
      data: transaction,
      autoRelabelledCount,
    })
  } catch (error) {
    console.error('Error relabelling transaction:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
// Batch relabel transactions
router.put('/relabel-batch', authMiddleware, async (req, res) => {
  try {
    const { transactionIds, categoryLabel } = req.body
    const validCategories = TRANSACTION_CATEGORIES
    if (!validCategories.includes(categoryLabel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category label',
      })
    }
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'transactionIds must be a non-empty array',
      })
    }

    const oldTransactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds } }
    })

    const result = await prisma.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        categoryLabel,
        isLabelled: true,
        confidence: 1.0,
      },
    })

    for (const oldTx of oldTransactions) {
      if (oldTx.transactionType === 'debit' && oldTx.categoryLabel !== categoryLabel) {
        if (oldTx.categoryLabel && oldTx.categoryLabel !== 'unlabelled') {
          await updateBudgetSpent(oldTx.userId, oldTx.categoryLabel, -oldTx.amount)
        }
        if (categoryLabel && categoryLabel !== 'unlabelled') {
          await updateBudgetSpent(oldTx.userId, categoryLabel, oldTx.amount)
        }
      }
    }

    // Simpan label rule ke semua user yang transaksi
    const affectedTransactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds } },
      select: { userId: true, description: true, dateTime: true },
    })
    // Kumpulkan bulan yang perlu dihitung ulang per user
    const monthsPerUser = {}
    for (const tx of affectedTransactions) {
      const uid = tx.userId
      const key = `${tx.dateTime.getFullYear()}-${tx.dateTime.getMonth() + 1}`
      if (!monthsPerUser[uid]) monthsPerUser[uid] = new Set()
      monthsPerUser[uid].add(key)
    }
    // Hitung ulang aggregation untuk setiap user & bulan
    for (const [uid, months] of Object.entries(monthsPerUser)) {
      for (const monthKey of months) {
        const [yr, mo] = monthKey.split('-')
        try {
          await calculateMonthlyAggregation(uid, Number(yr), Number(mo))
        } catch (aggErr) {
          console.warn('[RELABEL-BATCH] Aggregation recalculate gagal:', aggErr.message)
        }
      }
    }
    res.json({
      success: true,
      message: `${result.count} transactions relabelled`,
      modifiedCount: result.count,
    })
  } catch (error) {
    console.error('Error batch relabelling:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
// POST /api/transactions/sync
// Sync dari Mock API + NLP + cek label_rules, aggregation, forecast, avatar
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { linkedAccounts: true },
    })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    // Jalankan full pipeline di background (non-blocking):
    // Mock API + cek label_rules, lalu NLP, aggregation, forecast, avatar
    runAsyncMockBuilder(userId, user.monthlyIncome, user.jobType, user.linkedAccounts)
    res.json({
      success: true,
      message: 'Sync started. Transaksi sedang diproses di background (NLP + aggregation + forecast + avatar).',
      status: 'processing',
    })
  } catch (error) {
    console.error('Error syncing transactions:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
export default router
