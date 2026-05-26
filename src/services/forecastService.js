import prisma from "../lib/prisma.js";
import { forecastAI } from "./aiApiService.js";

function getPersonaId(jobType) {
  const mapping = {
    civil_servant: 5,
    permanent: 8,
    freelance: 4,
    gig: 7,
    entrepreneur: 2,
    not_working: 11,
  };

  return mapping[jobType] || 8;
}

export async function generateForecast(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const aggregations = await prisma.aggregation.findMany({
    where: { userId },
    orderBy: { monthYear: "asc" },
  });

  const monthlyIncome = user.monthlyIncome || 5000000;

  // Handle case with insufficient data
  if (aggregations.length < 3) {
    const latestAgg = aggregations[aggregations.length - 1];
    const balance = latestAgg?.currentTotalBalance || 0;
    
    return {
      success: true,
      message: "Insufficient data for full forecast (need 3 months)",
      predictedExpenses: Array(12).fill(user.monthlyIncome * 0.7 || 3500000),
      projectedWealth: balance + (monthlyIncome * 0.3 * 12 * 20),
      pensionSurvivalYears: 5,
      condition: "normal",
      recommendedAssetClass: "Dana darurat, reksadana pasar uang",
      isFallback: true
    };
  }

  const history = aggregations.map((agg) => ({
    totalExpense: agg.totalExpense,
    totalIncome: agg.totalIncome || monthlyIncome,
    monthYear: agg.monthYear,
  }));

  const predictedExpenses = [];

  const slidingWindow = [...history];

  for (let i = 0; i < 12; i++) {
    const endIdx = slidingWindow.length - 1;

    const lag1 = slidingWindow[endIdx].totalExpense;
    const lag2 = slidingWindow[endIdx - 1].totalExpense;
    const lag3 = slidingWindow[endIdx - 2].totalExpense;

    const roll3Mean = (lag1 + lag2 + lag3) / 3;

    const roll6Slice = slidingWindow.slice(-6);

    const roll6Mean =
      roll6Slice.reduce((sum, item) => sum + item.totalExpense, 0) /
      roll6Slice.length;

    const variance =
      ((lag1 - roll3Mean) ** 2 +
        (lag2 - roll3Mean) ** 2 +
        (lag3 - roll3Mean) ** 2) /
      3;

    const roll3Std = Math.sqrt(variance);

    const lag1Income = slidingWindow[endIdx].totalIncome;

    const lag1SavingsRate =
      (lag1Income - lag1) / (lag1Income || 1);

    const lag1ExpenseGrowth =
      (lag1 - lag2) / (lag2 || 1);

    const currentMonth = new Date().getMonth() + i + 1;

    const bulanSin = Math.sin(
      (2 * Math.PI * currentMonth) / 12
    );

    const bulanCos = Math.cos(
      (2 * Math.PI * currentMonth) / 12
    );

    const payload = {
      lag1_total_expense: lag1,
      lag2_total_expense: lag2,
      lag3_total_expense: lag3,
      roll3_mean_expense: roll3Mean,
      roll6_mean_expense: roll6Mean,
      roll3_std_expense: roll3Std,
      lag1_monthly_income: lag1Income,
      lag1_savings_rate: lag1SavingsRate,
      lag1_expense_growth: lag1ExpenseGrowth,
      bulan_sin: bulanSin,
      bulan_cos: bulanCos,
      persona_id: getPersonaId(user.jobType),
    };

    let prediction;

    try {
      prediction = await forecastAI(payload);
    } catch (err) {
      console.error("Forecast AI failed:", err.message);

      prediction = {
        prediction: roll3Mean,
      };
    }

    const predictedExpense =
      prediction.predicted_expense ||
      prediction.prediction ||
      prediction.value ||
      roll3Mean;

    predictedExpenses.push(predictedExpense);

    slidingWindow.push({
      totalExpense: predictedExpense,
      totalIncome: monthlyIncome,
    });
  }

  // Retirement calculation
  const avgExpense =
    aggregations.reduce(
      (sum, agg) => sum + agg.totalExpense,
      0
    ) / aggregations.length;

  const annualExpense = avgExpense * 12;

  const birthYear = user.birthDate
    ? new Date(user.birthDate).getFullYear()
    : 2000;

  const currentAge =
    new Date().getFullYear() - birthYear;

  const retirementAge = user.retirementAge || 55;

  const yearsToRetirement =
    retirementAge - currentAge;

  const avgMonthlySavings =
    predictedExpenses.reduce(
      (sum, val) => sum + (monthlyIncome - val),
      0
    ) / predictedExpenses.length;

  const latestAgg =
    aggregations[aggregations.length - 1];

  const currentTotalBalance =
    latestAgg?.currentTotalBalance || 0;

  const projectedWealth =
    currentTotalBalance +
    avgMonthlySavings * 12 * yearsToRetirement;

  const pensionSurvivalYears =
    annualExpense > 0
      ? projectedWealth / annualExpense
      : 0;

  let condition = "bad";
  let recommendedAssetClass =
    "Dana darurat, kurangi pengeluaran, reksadana pasar uang";

  if (pensionSurvivalYears > 20) {
    condition = "good";
    recommendedAssetClass =
      "Saham, reksadana saham, campuran";
  } else if (pensionSurvivalYears >= 10) {
    condition = "normal";
    recommendedAssetClass =
      "Obligasi, reksadana pendapatan tetap";
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      avatarCondition: condition,
    },
  });

  const avatarState = await prisma.avatarState.upsert({
    where: {
      userId,
    },
    update: {
      condition,
      projectedWealth,
      pensionSurvivalYears,
      recommendedAssetClass,
      predictedExpenseTrend: predictedExpenses,
      lastCalculated: new Date(),
    },
    create: {
      userId,
      condition,
      projectedWealth,
      pensionSurvivalYears,
      recommendedAssetClass,
      predictedExpenseTrend: predictedExpenses,
    },
  });

  return {
    success: true,
    predictedExpenses,
    projectedWealth,
    pensionSurvivalYears,
    condition,
    recommendedAssetClass,
    avatarState,
  };
}