import prisma from "../lib/prisma.js";

export async function calculateAvatar(userId, predictedExpenses) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const aggregations = await prisma.aggregation.findMany({
    where: { userId },
    orderBy: {
      monthYear: "asc",
    },
  });

  const last12Aggs = aggregations.slice(-12);

  const avgExpense =
    last12Aggs.reduce((sum, agg) => sum + agg.totalExpense, 0) /
    last12Aggs.length;

  const annualExpense = avgExpense * 12;

  const birthYear = user.birthDate
    ? new Date(user.birthDate).getFullYear()
    : 2000;

  const currentAge = new Date().getFullYear() - birthYear;

  const retirementAge = user.retirementAge || 55;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  const monthlyIncome = user.monthlyIncome || 0;

  const avgMonthlySavings =
    predictedExpenses.reduce(
      (sum, expense) => sum + (monthlyIncome - expense),
      0,
    ) / predictedExpenses.length;

  const latestAgg = aggregations[aggregations.length - 1];

  const currentTotalBalance = latestAgg?.currentTotalBalance || 0;

  const projectedWealth =
    currentTotalBalance + avgMonthlySavings * 12 * yearsToRetirement;

  const pensionSurvivalYears =
    annualExpense > 0 ? projectedWealth / annualExpense : 0;

  let condition = "bad";

  let recommendedAssetClass = "Dana darurat, reksadana pasar uang";

  if (pensionSurvivalYears > 20) {
    condition = "good";

    recommendedAssetClass = "Saham, reksadana saham";
  } else if (pensionSurvivalYears >= 10) {
    condition = "normal";

    recommendedAssetClass = "Obligasi, pendapatan tetap";
  }

  await prisma.user.update({
    where: { id: userId },

    data: {
      avatarCondition: condition,
    },
  });

  const avatarState = await prisma.avatarState.upsert({
    where: { userId },

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

  return avatarState;
}
