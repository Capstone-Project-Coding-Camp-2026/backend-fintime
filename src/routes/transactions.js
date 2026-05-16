import express from 'express'
import authMiddleware from '../middleware/auth.js'
import prisma from '../lib/prisma.js'

const router = express.Router()

router.get('/:userId/unlabelled', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { categoryLabel: null },
          { categoryLabel: "lainnya" },
          { isLabelled: false },
        ],
      },
      orderBy: { dateTime: "desc" },
    })

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
    })
  } catch (error) {
    console.error("Error getting unlabelled transactions:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      category,
      type,
    } = req.query

    const where = { userId }

    if (startDate || endDate) {
      where.dateTime = {}
      if (startDate) where.dateTime.gte = new Date(startDate)
      if (endDate) where.dateTime.lte = new Date(endDate)
    }

    if (category) where.categoryLabel = category
    if (type) where.transactionType = type

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { dateTime: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.transaction.count({ where })
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
        dateTime: { gte: startDate, lte: endDate }
      }
    })

    const totalIncome = transactions
      .filter(t => t.transactionType === 'credit')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.transactionType === 'debit')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenseByCategory = {}
    transactions
      .filter(t => t.transactionType === 'debit' && t.categoryLabel)
      .forEach(t => {
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
        transaction_count: transactions.length
      }
    })
  } catch (error) {
    console.error('Error getting monthly aggregation:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Create a new transaction
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, dateTime, description, amount, transactionType, paymentMethod, categoryLabel } = req.body

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        description,
        amount,
        transactionType,
        paymentMethod: paymentMethod || 'tunai',
        categoryLabel: categoryLabel || 'lainnya',
        isLabelled: true,
        confidence: 1.0
      }
    })

    res.status(201).json({
      success: true,
      message: 'Transaction created',
      data: transaction
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Relabel a single transaction
router.put('/:transactionId/relabel', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params
    const { categoryLabel } = req.body

    const validCategories = [
      'perumahan', 'makanan', 'transport', 'hiburan', 'kesehatan',
      'pendidikan', 'belanja', 'tagihan', 'gaji', 'investasi',
      'freelance', 'hadiah', 'lainnya'
    ]

    if (!validCategories.includes(categoryLabel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category label'
      })
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryLabel,
        isLabelled: true,
        confidence: 1.0
      }
    })

    res.json({
      success: true,
      message: 'Transaction relabelled successfully',
      data: transaction
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

    const validCategories = [
      'perumahan', 'makanan', 'transport', 'hiburan', 'kesehatan',
      'pendidikan', 'belanja', 'tagihan', 'gaji', 'investasi',
      'freelance', 'hadiah', 'lainnya'
    ]

    if (!validCategories.includes(categoryLabel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category label'
      })
    }

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'transactionIds must be a non-empty array'
      })
    }

    const result = await prisma.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        categoryLabel,
        isLabelled: true,
        confidence: 1.0
      }
    })

    res.json({
      success: true,
      message: `${result.count} transactions relabelled`,
      modifiedCount: result.count
    })
  } catch (error) {
    console.error('Error batch relabelling:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router