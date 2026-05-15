import express from 'express'
import authMiddleware from '../middleware/auth.js'
import prisma from '../lib/prisma.js'

const router = express.Router()

// ============================================================
// LINKED ACCOUNT ROUTES
// ============================================================

// Get all linked accounts for a user
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params

    const accounts = await prisma.linkedAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

    res.json({
      success: true,
      data: accounts,
      summary: {
        count: accounts.length,
        totalBalance
      }
    })
  } catch (error) {
    console.error('Error getting linked accounts:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Get account summary for dashboard
router.get('/:userId/summary', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params

    const accounts = await prisma.linkedAccount.findMany({
      where: { userId, isActive: true }
    })

    const banks = accounts.filter(a => a.type === 'bank')
    const ewallets = accounts.filter(a => a.type === 'ewallet')

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
        accounts
      }
    })
  } catch (error) {
    console.error('Error getting account summary:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Link a new account
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, type, provider, name, accountNumber, balance } = req.body

    // Check if already linked
    const existing = await prisma.linkedAccount.findFirst({
      where: { userId, provider, isActive: true }
    })

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Account already linked'
      })
    }

    const linkedAccount = await prisma.linkedAccount.create({
      data: {
        userId,
        type,
        provider,
        name,
        accountNumber,
        balance: balance || 0
      }
    })

    res.status(201).json({
      success: true,
      message: 'Account linked successfully',
      data: linkedAccount
    })
  } catch (error) {
    console.error('Error linking account:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Update account balance
router.put('/:accountId/balance', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.params
    const { balance } = req.body

    const account = await prisma.linkedAccount.update({
      where: { id: accountId },
      data: {
        balance,
        lastSynced: new Date()
      }
    })

    res.json({
      success: true,
      message: 'Balance updated',
      data: account
    })
  } catch (error) {
    console.error('Error updating balance:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Update account
router.put('/:accountId', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.params
    const { type, provider, name, accountNumber, balance } = req.body

    const account = await prisma.linkedAccount.update({
      where: { id: accountId },
      data: {
        ...(type && { type }),
        ...(provider && { provider }),
        ...(name && { name }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(balance !== undefined && { balance }),
        lastSynced: new Date()
      }
    })

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: account
    })
  } catch (error) {
    console.error('Error updating account:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Unlink an account
router.delete('/:accountId', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.params

    const account = await prisma.linkedAccount.update({
      where: { id: accountId },
      data: { isActive: false }
    })

    res.json({
      success: true,
      message: 'Account unlinked successfully'
    })
  } catch (error) {
    console.error('Error unlinking account:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router