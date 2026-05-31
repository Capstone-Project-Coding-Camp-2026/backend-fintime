import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories.js'

const router = express.Router()

// GET /api/users/:userId/label-rules
router.get('/:userId/label-rules', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { labelRules: true },
    })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({
      success: true,
      data: user.labelRules || [],
    })
  } catch (error) {
    console.error('Error getting label rules:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
// PUT /api/users/:userId/label-rules
// Body: { description: "GRAB FOOD", categoryLabel: "makanan" }
// Saves a rule to User.labelRules and auto-relabels matching transactions
router.put('/:userId/label-rules', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const { description, categoryLabel } = req.body
    if (!description || !categoryLabel) {
      return res.status(400).json({
        success: false,
        message: 'description and categoryLabel are required',
      })
    }
    if (!TRANSACTION_CATEGORIES.includes(categoryLabel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category label',
      })
    }
    // 1. Get current user with labelRules
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { labelRules: true },
    })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    // 2. Update or add the rule
    const matchKey = description.toLowerCase().trim()
    let rules = Array.isArray(user.labelRules) ? [...user.labelRules] : []
    const existingIdx = rules.findIndex((r) => r.match && r.match.toLowerCase() === matchKey)
    if (existingIdx >= 0) {
      // Update existing rule
      rules[existingIdx] = { match: matchKey, category: categoryLabel }
    } else {
      // Add new rule
      rules.push({ match: matchKey, category: categoryLabel })
    }
    // 3. Save updated rules to user
    await prisma.user.update({
      where: { id: userId },
      data: { labelRules: rules },
    })
    // 4. Auto-relabel all matching unlabelled transactions for this user
    // Find transactions whose description contains the match string
    const matchingTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ isLabelled: false }, { categoryLabel: null }, { categoryLabel: 'lainnya' }],
        description: {
          contains: matchKey,
          mode: 'insensitive',
        },
      },
    })
    let autoRelabelledCount = 0
    if (matchingTransactions.length > 0) {
      const result = await prisma.transaction.updateMany({
        where: {
          id: { in: matchingTransactions.map((t) => t.id) },
        },
        data: {
          categoryLabel,
          confidence: 1.0,
          isLabelled: true,
        },
      })
      autoRelabelledCount = result.count
    }
    res.json({
      success: true,
      message: 'Label rule saved',
      data: {
        rules,
        autoRelabelledCount,
      },
    })
  } catch (error) {
    console.error('Error saving label rule:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})
export default router
