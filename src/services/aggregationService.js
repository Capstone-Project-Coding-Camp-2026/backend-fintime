import prisma from "../lib/prisma.js";

import { EXCLUDED_EXPENSE_CATEGORIES } from "../utils/constants.js";

export async function calculateMonthlyAggregation(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);

  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalIncome = transactions
    .filter((t) => t.transactionType === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(
      (t) =>
        t.transactionType === "debit" &&
        !EXCLUDED_EXPENSE_CATEGORIES.includes(t.categoryLabel),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsCapacity = totalIncome - totalExpense;

  const expenseByCategory = {};

  transactions
    .filter((t) => t.transactionType === "debit" && t.categoryLabel)
    .forEach((t) => {
      if (!expenseByCategory[t.categoryLabel]) {
        expenseByCategory[t.categoryLabel] = 0;
      }

      expenseByCategory[t.categoryLabel] += t.amount;
    });

  // previous month
  const prevDate = new Date(year, month - 2, 1);

  const prevMonthYear = `${prevDate.getFullYear()}-${String(
    prevDate.getMonth() + 1,
  ).padStart(2, "0")}`;

  const previousAgg = await prisma.aggregation.findFirst({
    where: {
      userId,
      monthYear: prevMonthYear,
    },
  });

  const previousBalance = previousAgg?.currentTotalBalance || 0;

  const currentTotalBalance = previousBalance + savingsCapacity;

  const monthYear = `${year}-${String(month).padStart(2, "0")}`;

  const aggregation = await prisma.aggregation.upsert({
    where: {
      userId_monthYear: {
        userId,
        monthYear,
      },
    },

    update: {
      totalIncome,
      totalExpense,
      savingsCapacity,
      currentTotalBalance,
      expenseByCategory,
      transactionCount: transactions.length,
    },

    create: {
      userId,
      monthYear,
      totalIncome,
      totalExpense,
      savingsCapacity,
      currentTotalBalance,
      expenseByCategory,
      transactionCount: transactions.length,
    },
  });

  return aggregation;
}
