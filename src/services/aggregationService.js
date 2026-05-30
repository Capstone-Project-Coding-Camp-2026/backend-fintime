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
  let expenseHousing = 0
  let expenseFoodDrink = 0
  let expenseTransportation = 0
  let expenseEntertainment = 0
  let expenseHealth = 0
  let expenseEducation = 0
  let expenseShopping = 0
  let expenseBills = 0
  let expenseInvestment = 0
  let expenseOther = 0

  for (const t of transactions) {
    if (t.transactionType === 'credit') {
      totalIncome += t.amount
    } else if (t.transactionType === 'debit') {
      // Exclude topup_ewallet and transfer_internal
      if (t.categoryLabel !== 'topup_ewallet' && t.categoryLabel !== 'transfer_internal') {
        totalExpense += t.amount

        // Categorize
        const cat = t.categoryLabel || 'lainnya'
        if (cat === 'makanan' || cat === 'food') expenseFoodDrink += t.amount
        else if (cat === 'transport' || cat === 'transportasi') expenseTransportation += t.amount
        else if (cat === 'hiburan' || cat === 'entertainment') expenseEntertainment += t.amount
        else if (cat === 'belanja' || cat === 'shopping') expenseShopping += t.amount
        else if (cat === 'tagihan' || cat === 'bills') expenseBills += t.amount
        else if (cat === 'kesehatan' || cat === 'health') expenseHealth += t.amount
        else if (cat === 'pendidikan' || cat === 'education') expenseEducation += t.amount
        else if (cat === 'perumahan' || cat === 'housing') expenseHousing += t.amount
        else if (cat === 'investasi' || cat === 'investment') expenseInvestment += t.amount
        else expenseOther += t.amount
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
      expenseHousing,
      expenseFoodDrink,
      expenseTransportation,
      expenseEntertainment,
      expenseHealth,
      expenseEducation,
      expenseShopping,
      expenseBills,
      expenseInvestment,
      expenseOther,
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
      expenseHousing,
      expenseFoodDrink,
      expenseTransportation,
      expenseEntertainment,
      expenseHealth,
      expenseEducation,
      expenseShopping,
      expenseBills,
      expenseInvestment,
      expenseOther,
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
