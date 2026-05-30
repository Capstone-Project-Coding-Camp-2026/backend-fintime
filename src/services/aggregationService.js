import prisma from '../lib/prisma.js'

export async function calculateMonthlyAggregation(userId, year, month) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)
  const monthYear = `${year}-${String(month).padStart(2, '0')}`

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  let totalIncome = 0
  let totalExpense = 0
  const expenses = {
    expenseHousing: 0,
    expenseFoodDrink: 0,
    expenseTransportation: 0,
    expenseEntertainment: 0,
    expenseHealth: 0,
    expenseEducation: 0,
    expenseShopping: 0,
    expenseBills: 0,
    expenseInvestment: 0,
    expenseOther: 0,
  }

  const categoryMap = {
    makanan: 'expenseFoodDrink',
    food: 'expenseFoodDrink',
    transport: 'expenseTransportation',
    transportasi: 'expenseTransportation',
    hiburan: 'expenseEntertainment',
    entertainment: 'expenseEntertainment',
    belanja: 'expenseShopping',
    shopping: 'expenseShopping',
    tagihan: 'expenseBills',
    bills: 'expenseBills',
    kesehatan: 'expenseHealth',
    health: 'expenseHealth',
    pendidikan: 'expenseEducation',
    education: 'expenseEducation',
    perumahan: 'expenseHousing',
    housing: 'expenseHousing',
    investasi: 'expenseInvestment',
    investment: 'expenseInvestment',
  };

  for (const t of transactions) {
    if (t.transactionType === 'credit') {
      totalIncome += t.amount
    } else if (t.transactionType === 'debit') {
      // Exclude topup_ewallet and transfer_internal
      if (t.categoryLabel !== 'topup_ewallet' && t.categoryLabel !== 'transfer_internal') {
        totalExpense += t.amount

        // Categorize
        const cat = t.categoryLabel?.toLowerCase() || 'lainnya'
        const target = categoryMap[cat] || 'expenseOther'
        expenses[target] += t.amount
      }
    }
  }

  const savingsCapacity = totalIncome - totalExpense
  const expenseToIncomeRatio = totalIncome > 0 ? totalExpense / totalIncome : 0
  const savingsRate = totalIncome > 0 ? savingsCapacity / totalIncome : 0

  // Upsert aggregation
  const agg = await prisma.aggregation.upsert({
    where: {
      userId_monthYear: {
        userId,
        monthYear,
      },
    },
    update: {
      totalIncome,
      totalExpense,
      ...expenses,
      savingsCapacity,
      expenseToIncomeRatio,
      savingsRate,
      transactionCount: transactions.length,
    },
    create: {
      userId,
      monthYear,
      totalIncome,
      totalExpense,
      ...expenses,
      savingsCapacity,
      expenseToIncomeRatio,
      savingsRate,
      transactionCount: transactions.length,
      currentTotalBalance: 0, // This should be updated sequentially if needed
    },
  })

  // Calculate currentTotalBalance across all aggregations
  const allAggs = await prisma.aggregation.findMany({
    where: { userId },
    orderBy: { monthYear: 'asc' },
  })

  let currentBalance = 0
  for (const a of allAggs) {
    currentBalance += a.savingsCapacity
    if (a.id === agg.id && a.currentTotalBalance !== currentBalance) {
      await prisma.aggregation.update({
        where: { id: a.id },
        data: { currentTotalBalance: currentBalance },
      })
    }
  }

  return agg
}
