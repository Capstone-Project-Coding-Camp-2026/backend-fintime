import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Budget Controller
export const getBudgets = async (req, res) => {
  try {
    const userId = req.params.userId
    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: budgets })
  } catch (error) {
    console.error('Get budgets error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch budgets' })
  }
}

export const createBudget = async (req, res) => {
  try {
    const userId = req.params.userId
    const { category, limit, period } = req.body

    const budgetPeriod = period || 'monthly'

    // Check if budget already exists
    const existing = await prisma.budget.findFirst({
      where: { userId, category, period: budgetPeriod }
    })

    if (existing) {
      // If it exists but is inactive, we can reactivate it and update limit
      if (!existing.isActive) {
        const budget = await prisma.budget.update({
          where: { id: existing.id },
          data: { isActive: true, limit: parseFloat(limit), spent: 0 }
        })
        return res.json({ success: true, data: budget })
      }
      return res.status(400).json({
        success: false,
        message: 'Budget untuk kategori ini pada periode ini sudah ada'
      })
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        category,
        limit: parseFloat(limit),
        period: budgetPeriod
      }
    })

    res.json({ success: true, data: budget })
  } catch (error) {
    console.error('Create budget error:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Budget untuk kategori ini pada periode ini sudah ada' })
    }
    res.status(500).json({ success: false, message: 'Failed to create budget' })
  }
}

export const updateBudget = async (req, res) => {
  try {
    const { budgetId } = req.params
    const { category, limit, period, spent } = req.body

    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(category && { category }),
        ...(limit && { limit: parseFloat(limit) }),
        ...(period && { period }),
        ...(spent !== undefined && { spent: parseFloat(spent) })
      }
    })

    res.json({ success: true, data: budget })
  } catch (error) {
    console.error('Update budget error:', error)
    res.status(500).json({ success: false, message: 'Failed to update budget' })
  }
}

export const deleteBudget = async (req, res) => {
  try {
    const { budgetId } = req.params

    await prisma.budget.update({
      where: { id: budgetId },
      data: { isActive: false }
    })

    res.json({ success: true, message: 'Budget deleted' })
  } catch (error) {
    console.error('Delete budget error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete budget' })
  }
}

// Debt Controller
export const getDebts = async (req, res) => {
  try {
    const userId = req.params.userId
    const debts = await prisma.debt.findMany({
      where: { userId, isActive: true },
      include: { payments: { orderBy: { paidAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: debts })
  } catch (error) {
    console.error('Get debts error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch debts' })
  }
}

export const createDebt = async (req, res) => {
  try {
    const userId = req.params.userId
    const { name, type, lender, totalAmount, remainingAmount, interestRate, tenorMonths, monthlyPayment, startDate, dueDate, notes } = req.body

    const debt = await prisma.debt.create({
      data: {
        userId,
        name,
        debtType: type,
        lender,
        totalAmount: parseFloat(totalAmount),
        remainingAmount: parseFloat(remainingAmount || totalAmount),
        interestRate: parseFloat(interestRate) || 0,
        tenorMonths: parseInt(tenorMonths) || null,
        monthlyPayment: parseFloat(monthlyPayment) || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes
      }
    })

    res.json({ success: true, data: debt })
  } catch (error) {
    console.error('Create debt error:', error)
    res.status(500).json({ success: false, message: 'Failed to create debt' })
  }
}

export const updateDebt = async (req, res) => {
  try {
    const { debtId } = req.params
    const { name, type, lender, totalAmount, remainingAmount, interestRate, tenorMonths, monthlyPayment, startDate, dueDate, notes, isActive } = req.body

    const debt = await prisma.debt.update({
      where: { id: debtId },
      data: {
        ...(name && { name }),
        ...(type && { debtType: type }),
        ...(lender !== undefined && { lender }),
        ...(totalAmount && { totalAmount: parseFloat(totalAmount) }),
        ...(remainingAmount !== undefined && { remainingAmount: parseFloat(remainingAmount) }),
        ...(interestRate !== undefined && { interestRate: parseFloat(interestRate) }),
        ...(tenorMonths !== undefined && { tenorMonths: parseInt(tenorMonths) }),
        ...(monthlyPayment !== undefined && { monthlyPayment: parseFloat(monthlyPayment) }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      }
    })

    res.json({ success: true, data: debt })
  } catch (error) {
    console.error('Update debt error:', error)
    res.status(500).json({ success: false, message: 'Failed to update debt' })
  }
}

export const deleteDebt = async (req, res) => {
  try {
    const { debtId } = req.params

    await prisma.debt.update({
      where: { id: debtId },
      data: { isActive: false }
    })

    res.json({ success: true, message: 'Debt deleted' })
  } catch (error) {
    console.error('Delete debt error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete debt' })
  }
}

export const recordDebtPayment = async (req, res) => {
  try {
    const { debtId } = req.params
    const { amount, paidAt, notes } = req.body

    // Create payment record
    const payment = await prisma.debtPayment.create({
      data: {
        debtId,
        amount: parseFloat(amount),
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        notes
      }
    })

    // Update remaining debt amount
    const debt = await prisma.debt.update({
      where: { id: debtId },
      data: {
        remainingAmount: {
          decrement: parseFloat(amount)
        }
      }
    })

    res.json({ success: true, data: { payment, debt } })
  } catch (error) {
    console.error('Record payment error:', error)
    res.status(500).json({ success: false, message: 'Failed to record payment' })
  }
}

// Goal Controller
export const getGoals = async (req, res) => {
  try {
    const userId = req.params.userId
    const goals = await prisma.goal.findMany({
      where: { userId, isActive: true },
      include: { savings: { orderBy: { savedAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: goals })
  } catch (error) {
    console.error('Get goals error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch goals' })
  }
}

export const createGoal = async (req, res) => {
  try {
    const userId = req.params.userId
    const { name, category, targetAmount, currentAmount, targetDate, description } = req.body

    let parsedTargetDate = null
    if (targetDate) {
      parsedTargetDate = new Date(targetDate)
      // Validate date and year range (prevent 20277)
      if (isNaN(parsedTargetDate.getTime()) || parsedTargetDate.getFullYear() > 2100 || parsedTargetDate.getFullYear() < 2000) {
        return res.status(400).json({ success: false, message: 'Format tanggal tidak valid' })
      }
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        name,
        category,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: parsedTargetDate,
        description,
        isCompleted: currentAmount >= targetAmount,
        completedAt: currentAmount >= targetAmount ? new Date() : null
      }
    })

    res.json({ success: true, data: goal })
  } catch (error) {
    console.error('Create goal error:', error)
    res.status(500).json({ success: false, message: 'Failed to create goal' })
  }
}

export const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params
    const { name, category, targetAmount, currentAmount, targetDate, description } = req.body

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(targetAmount && { targetAmount: parseFloat(targetAmount) }),
        ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(description !== undefined && { description })
      }
    })

    res.json({ success: true, data: goal })
  } catch (error) {
    console.error('Update goal error:', error)
    res.status(500).json({ success: false, message: 'Failed to update goal' })
  }
}

export const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params

    await prisma.goal.update({
      where: { id: goalId },
      data: { isActive: false }
    })

    res.json({ success: true, message: 'Goal deleted' })
  } catch (error) {
    console.error('Delete goal error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete goal' })
  }
}

export const addGoalSavings = async (req, res) => {
  try {
    const { goalId } = req.params
    const { amount, notes } = req.body

    // Create savings record
    const savings = await prisma.goalSavings.create({
      data: {
        goalId,
        amount: parseFloat(amount),
        notes
      }
    })

    // Update goal current amount
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: { increment: parseFloat(amount) }
      }
    })

    // Check if goal is completed
    if (goal.currentAmount + parseFloat(amount) >= goal.targetAmount) {
      await prisma.goal.update({
        where: { id: goalId },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      })
    }

    res.json({ success: true, data: { savings, goal } })
  } catch (error) {
    console.error('Add savings error:', error)
    res.status(500).json({ success: false, message: 'Failed to add savings' })
  }
}

// Investment Controller
export const getInvestments = async (req, res) => {
  try {
    const userId = req.params.userId
    const investments = await prisma.investment.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: investments })
  } catch (error) {
    console.error('Get investments error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch investments' })
  }
}

export const createInvestment = async (req, res) => {
  try {
    const userId = req.params.userId
    const { name, type, amount, currentValue, purchaseDate, notes } = req.body

    const investment = await prisma.investment.create({
      data: {
        userId,
        name,
        type,
        initialAmount: parseFloat(amount),
        currentValue: parseFloat(currentValue || amount),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        notes
      }
    })

    res.json({ success: true, data: investment })
  } catch (error) {
    console.error('Create investment error:', error)
    res.status(500).json({ success: false, message: 'Failed to create investment' })
  }
}

export const updateInvestment = async (req, res) => {
  try {
    const { investmentId } = req.params
    const { name, type, amount, currentValue, purchaseDate, notes, isActive } = req.body

    const investment = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(amount && { initialAmount: parseFloat(amount) }),
        ...(currentValue !== undefined && { currentValue: parseFloat(currentValue) }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      }
    })

    res.json({ success: true, data: investment })
  } catch (error) {
    console.error('Update investment error:', error)
    res.status(500).json({ success: false, message: 'Failed to update investment' })
  }
}

export const deleteInvestment = async (req, res) => {
  try {
    const { investmentId } = req.params

    await prisma.investment.update({
      where: { id: investmentId },
      data: { isActive: false }
    })

    res.json({ success: true, message: 'Investment deleted' })
  } catch (error) {
    console.error('Delete investment error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete investment' })
  }
}

// Recurring Controller
export const getRecurring = async (req, res) => {
  try {
    const userId = req.params.userId
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: recurring })
  } catch (error) {
    console.error('Get recurring error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch recurring' })
  }
}

export const createRecurring = async (req, res) => {
  try {
    const userId = req.params.userId
    const { name, type, amount, category, frequency, startDate, nextDate, notes, active } = req.body

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId,
        name,
        type,
        amount: parseFloat(amount),
        category,
        frequency,
        startDate: startDate ? new Date(startDate) : null,
        nextDate: nextDate ? new Date(nextDate) : new Date(),
        notes,
        isActive: active !== false
      }
    })

    res.json({ success: true, data: recurring })
  } catch (error) {
    console.error('Create recurring error:', error)
    res.status(500).json({ success: false, message: 'Failed to create recurring' })
  }
}

export const updateRecurring = async (req, res) => {
  try {
    const { recurringId } = req.params
    const { name, type, amount, category, frequency, startDate, nextDate, notes, active } = req.body

    const recurring = await prisma.recurringTransaction.update({
      where: { id: recurringId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(category !== undefined && { category }),
        ...(frequency && { frequency }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(nextDate !== undefined && { nextDate: nextDate ? new Date(nextDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(active !== undefined && { isActive: active })
      }
    })

    res.json({ success: true, data: recurring })
  } catch (error) {
    console.error('Update recurring error:', error)
    res.status(500).json({ success: false, message: 'Failed to update recurring' })
  }
}

export const deleteRecurring = async (req, res) => {
  try {
    const { recurringId } = req.params

    await prisma.recurringTransaction.update({
      where: { id: recurringId },
      data: { isActive: false }
    })

    res.json({ success: true, message: 'Recurring deleted' })
  } catch (error) {
    console.error('Delete recurring error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete recurring' })
  }
}