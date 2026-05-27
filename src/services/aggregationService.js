import prisma from "../lib/prisma.js";

import { EXCLUDED_EXPENSE_CATEGORIES } from "../config/utils/constants.js";

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
      transactionCount: transactions.length,
      expenseHousing: expenseByCategory["perumahan"] || 0,
      expenseFoodDrink: expenseByCategory["makanan"] || 0,
      expenseTransportation: expenseByCategory["transport"] || 0,
      expenseEntertainment: expenseByCategory["hiburan"] || 0,
      expenseHealth: expenseByCategory["kesehatan"] || 0,
      expenseEducation: expenseByCategory["pendidikan"] || 0,
      expenseShopping: expenseByCategory["belanja"] || 0,
      expenseBills: expenseByCategory["tagihan"] || 0,
      expenseInvestment: expenseByCategory["investasi"] || 0,
      expenseOther:
        (expenseByCategory["lainnya"] || 0) +
        (expenseByCategory["tidak_diketahui"] || 0) +
        (expenseByCategory["topup_ewallet"] || 0) +
        (expenseByCategory["transfer_internal"] || 0) +
        (expenseByCategory["transfer_keluarga"] || 0) +
        (expenseByCategory["transfer_sosial"] || 0),
    },

    create: {
      userId,
      monthYear,
      totalIncome,
      totalExpense,
      savingsCapacity,
      currentTotalBalance,
      transactionCount: transactions.length,
      expenseHousing: expenseByCategory["perumahan"] || 0,
      expenseFoodDrink: expenseByCategory["makanan"] || 0,
      expenseTransportation: expenseByCategory["transport"] || 0,
      expenseEntertainment: expenseByCategory["hiburan"] || 0,
      expenseHealth: expenseByCategory["kesehatan"] || 0,
      expenseEducation: expenseByCategory["pendidikan"] || 0,
      expenseShopping: expenseByCategory["belanja"] || 0,
      expenseBills: expenseByCategory["tagihan"] || 0,
      expenseInvestment: expenseByCategory["investasi"] || 0,
      expenseOther:
        (expenseByCategory["lainnya"] || 0) +
        (expenseByCategory["tidak_diketahui"] || 0) +
        (expenseByCategory["topup_ewallet"] || 0) +
        (expenseByCategory["transfer_internal"] || 0) +
        (expenseByCategory["transfer_keluarga"] || 0) +
        (expenseByCategory["transfer_sosial"] || 0),
    },
  });

  return aggregation;
}
