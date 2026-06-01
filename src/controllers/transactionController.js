import prisma from '../lib/prisma.js'
import { classifyWithRules } from '../services/nlpService.js'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories.js'

export const updateBudgetSpent = async (userId, categoryLabel, amountDelta) => {
  if (amountDelta === 0) return
  try {
    const activeBudget = await prisma.budget.findFirst({
      where: { userId, category: categoryLabel, isActive: true },
    })
    if (activeBudget) {
      const delta = parseFloat(amountDelta)
      const newSpent = Math.max(0, activeBudget.spent + delta)
      await prisma.budget.update({
        where: { id: activeBudget.id },
        data: { spent: newSpent },
      })
    }
  } catch (err) {
    console.error('Failed to update budget spent:', err)
  }
}

export const getTransactions = async (req, res) => {
  try {
    const userId = req.params.userId
    if (req.user.sub !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      })
    }
    const { page = 1, limit = 20, startDate, endDate, category, type } = req.query

    const where = { userId }

    if (startDate || endDate) {
      where.dateTime = {}
      if (startDate) where.dateTime.gte = new Date(startDate)
      if (endDate) where.dateTime.lte = new Date(endDate)
    }

    if (category) where.categoryLabel = category
    if (type) where.transactionType = type

    const skip = (page - 1) * limit
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { dateTime: 'desc' },
        skip: parseInt(skip),
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
    console.error('Error getting transactions:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get unlabelled transactions
export const getUnlabelledTransactions = async (req, res) => {
  try {
    const userId = req.params.userId
    if (req.user.sub !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      })
    }

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
}

// Relabel a single transaction
export const relabelTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params
    const { categoryLabel } = req.body

    if (!TRANSACTION_CATEGORIES.includes(categoryLabel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category label',
      })
    }

    const oldTransaction = await prisma.transaction.findUnique({ where: { id: transactionId } })
    if (!oldTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' })
    }

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

    res.json({
      success: true,
      message: 'Transaction relabelled successfully',
      data: transaction,
    })
  } catch (error) {
    console.error('Error relabelling transaction:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Batch relabel transactions
export const relabelBatch = async (req, res) => {
  try {
    const { transactionIds } = req.body
    const { categoryLabel } = req.body

    if (!TRANSACTION_CATEGORIES.includes(categoryLabel)) {
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

    res.json({
      success: true,
      message: `${result.count} transactions relabelled`,
      modifiedCount: result.count,
    })
  } catch (error) {
    console.error('Error batch relabelling:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const createTransaction = async (req, res) => {
  try {
    const userIdFromToken = req.user.sub
    const {
      dateTime,
      description,
      amount,
      transactionType,
      paymentMethod,
      categoryLabel: manualCategoryLabel,
    } = req.body

    // Ambil label_rules user (handle stringified JSON)
    const user = await prisma.user.findUnique({
      where: { id: userIdFromToken },
      select: { labelRules: true },
    })
    let labelRules = []
    if (Array.isArray(user?.labelRules)) {
      labelRules = user.labelRules
    } else if (typeof user?.labelRules === 'string') {
      try {
        labelRules = JSON.parse(user.labelRules)
      } catch (e) {
        console.warn('[createTransaction] Failed to parse labelRules JSON:', e)
        labelRules = []
      }
    }

    // Klasifikasi: label_rules kemudian  NLP (AI API) lalu fallback
    let predictedCategory = manualCategoryLabel || 'lainnya'
    let confidence = manualCategoryLabel ? 1.0 : 0
    let isLabelled = !!manualCategoryLabel

    if (!manualCategoryLabel || manualCategoryLabel === 'lainnya') {
      try {
        const result = await classifyWithRules(description, labelRules)
        // result may be null if no rule matches and AI fallback returns unlabelled
        if (result) {
          predictedCategory = result.category
          confidence = result.confidence
          isLabelled = result.isLabelled
        }
      } catch (aiError) {
        console.error('[createTransaction] Classification failed:', aiError.message)
        predictedCategory = 'lainnya'
        confidence = 0
        isLabelled = false
      }
    }

    // Save transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: userIdFromToken,
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        description,
        amount,
        transactionType,
        paymentMethod: paymentMethod || 'tunai',
        categoryLabel: predictedCategory,
        isLabelled,
        confidence,
      },
    })

    if (transaction.transactionType === 'debit') {
      await updateBudgetSpent(userIdFromToken, predictedCategory, amount)
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created',
      data: transaction,
    })
  } catch (error) {
    console.error('Error creating transaction:', error)

    res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

// Get monthly aggregation
export const getMonthlyAggregation = async (req, res) => {
  try {
    const userId = req.params.userId
    if (req.user.sub !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      })
    }
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
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter((t) => t.transactionType === 'debit')
      .reduce((sum, t) => sum + t.amount, 0)

    // Calculate by category
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
}

// Get all linked accounts for a user
export const getLinkedAccounts = async (req, res) => {
  try {
    const userId = req.params.userId
    if (req.user.sub !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      })
    }

    const accounts = await prisma.linkedAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

    res.json({
      success: true,
      data: accounts,
      summary: {
        count: accounts.length,
        totalBalance,
      },
    })
  } catch (error) {
    console.error('Error getting linked accounts:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Link a new account
export const linkAccount = async (req, res) => {
  try {
    const userId = req.user.sub
    const { type, provider, name, accountNumber, balance } = req.body

    // Check if already linked
    const existing = await prisma.linkedAccount.findFirst({
      where: { userId, provider, isActive: true },
    })

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Account already linked',
      })
    }

    const linkedAccount = await prisma.linkedAccount.create({
      data: {
        userId,
        type,
        provider,
        name,
        accountNumber,
        balance: balance || 0,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Account linked successfully',
      data: linkedAccount,
    })
  } catch (error) {
    console.error('Error linking account:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Update account balance
export const updateAccountBalance = async (req, res) => {
  try {
    const { accountId } = req.params
    const { balance } = req.body

    const account = await prisma.linkedAccount.update({
      where: { id: accountId },
      data: {
        balance,
        lastSynced: new Date(),
      },
    })

    res.json({
      success: true,
      message: 'Balance updated',
      data: account,
    })
  } catch (error) {
    console.error('Error updating balance:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Unlink an account
export const unlinkAccount = async (req, res) => {
  try {
    const { accountId } = req.params

    const account = await prisma.linkedAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    })

    res.json({
      success: true,
      message: 'Account unlinked successfully',
    })
  } catch (error) {
    console.error('Error unlinking account:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get account summary for dashboard
export const getAccountSummary = async (req, res) => {
  try {
    const userId = req.params.userId
    if (req.user.sub !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      })
    }
    if (req.user.sub !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      })
    }

    const accounts = await prisma.linkedAccount.findMany({
      where: { userId, isActive: true },
    })

    const banks = accounts.filter((a) => a.type === 'bank')
    const ewallets = accounts.filter((a) => a.type === 'ewallet')

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    const bankBalance = banks.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    const ewalletBalance = ewallets.reduce((sum, acc) => sum + (acc.balance || 0), 0)

    res.json({
      success: true,
      data: {
        totalBalance,
        bankBalance,
        ewalletBalance,
        bankCount: banks.length,
        ewalletCount: ewallets.length,
        accounts,
      },
    })
  } catch (error) {
    console.error('Error getting account summary:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

