import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import prisma from '../lib/prisma.js';

let forecastModel = null;
let scalerConfig = null;

const scalerPath = './src/models/tfjs/forecast/scaler_config.json';

export function initForecastService(model) {
  forecastModel = model;
  if (fs.existsSync(scalerPath)) {
    scalerConfig = JSON.parse(fs.readFileSync(scalerPath, 'utf8'));
  } else {
    console.error("Forecast scaler config not found:", scalerPath);
  }
}

function getPersonaId(jobType) {
  // jobType options: permanent / freelance / gig / civil_servant / entrepreneur / not_working
  const mapping = {
    'civil_servant': 5,
    'permanent': 8,
    'freelance': 4,
    'gig': 7,
    'entrepreneur': 2,
    'not_working': 11
  };
  return mapping[jobType] || 8; // default to 8 (mean of persona_id is 8.72)
}

export async function generateForecast(userId) {
  if (!forecastModel || !scalerConfig) {
    throw new Error("Forecast Service not initialized.");
  }

  // 1. Fetch User Data
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error("User not found");
  }

  const birthYear = user.birthDate ? new Date(user.birthDate).getFullYear() : 1999;
  const currentAge = new Date().getFullYear() - birthYear;
  const retirementAge = user.retirementAge || 55;
  const jobType = user.jobType || 'permanent';
  const monthlyIncome = user.monthlyIncome || 5000000;
  const personaId = getPersonaId(jobType);

  // 2. Fetch Aggregation History
  let aggregations = await prisma.aggregation.findMany({
    where: { userId: userId },
    orderBy: { monthYear: 'asc' }
  });

  // Pad history if we have less than 6 months of data to ensure rolling calculations work
  const history = aggregations.map(agg => ({
    totalExpense: agg.totalExpense,
    totalIncome: agg.totalIncome,
    monthYear: agg.monthYear
  }));

  const defaultExpense = monthlyIncome * 0.7;
  const lastMonthYear = history.length > 0 ? history[history.length - 1].monthYear : '2025-12';
  let [lastYear, lastMonth] = lastMonthYear.split('-').map(Number);

  while (history.length < 6) {
    // Prepend dummy historical months
    lastMonth = lastMonth - 1;
    if (lastMonth === 0) {
      lastMonth = 12;
      lastYear = lastYear - 1;
    }
    const padMonthStr = `${lastYear}-${String(lastMonth).padStart(2, '0')}`;
    history.unshift({
      totalExpense: defaultExpense,
      totalIncome: monthlyIncome,
      monthYear: padMonthStr
    });
  }

  // 3. Perform 12-month Rolling Forecast
  const predictedExpenses = [];
  const monthlySavingsCapacity = [];
  const slidingWindow = [...history];

  let nextYear = new Date().getFullYear();
  let nextMonth = new Date().getMonth() + 1; // 1-indexed

  const yScale = 1000000.0; // target column was divided by 1,000,000 during training

  for (let i = 0; i < 12; i++) {
    // Increment month
    nextMonth = nextMonth + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = nextYear + 1;
    }

    const endIdx = slidingWindow.length - 1;
    const lag1 = slidingWindow[endIdx].totalExpense;
    const lag2 = slidingWindow[endIdx - 1].totalExpense;
    const lag3 = slidingWindow[endIdx - 2].totalExpense;

    // Roll 3 mean
    const roll3Mean = (lag1 + lag2 + lag3) / 3;

    // Roll 6 mean
    let sum6 = 0;
    for (let j = 0; j < 6; j++) {
      sum6 += slidingWindow[endIdx - j].totalExpense;
    }
    const roll6Mean = sum6 / 6;

    // Roll 3 std
    const variance3 = ((lag1 - roll3Mean) ** 2 + (lag2 - roll3Mean) ** 2 + (lag3 - roll3Mean) ** 2) / 3;
    const roll3Std = Math.sqrt(variance3);

    const lag1Income = slidingWindow[endIdx].totalIncome;
    const lag1SavingsRate = (lag1Income - lag1) / (lag1Income || 1);
    const lag1ExpenseGrowth = (lag1 - lag2) / (lag2 || 1);

    const sinBulan = Math.sin((2 * Math.PI * nextMonth) / 12);
    const cosBulan = Math.cos((2 * Math.PI * nextMonth) / 12);

    // Feature values in order of scalerConfig.feature_cols
    const features = [
      lag1,
      lag2,
      lag3,
      roll3Mean,
      roll6Mean,
      roll3Std,
      lag1Income,
      lag1SavingsRate,
      lag1ExpenseGrowth,
      sinBulan,
      cosBulan,
      personaId
    ];

    // Scale features
    const scaledFeatures = features.map((val, idx) => {
      const mean = scalerConfig.mean[idx];
      const std = scalerConfig.std[idx];
      return (val - mean) / std;
    });

    // Run prediction
    let inputTensor = null;
    let prediction = null;
    let predictedVal = 0;
    try {
      inputTensor = tf.tensor2d([scaledFeatures], [1, 12]);
      prediction = forecastModel.predict(inputTensor);
      const predictionValRaw = (await prediction.array())[0][0];
      predictedVal = predictionValRaw * yScale; // Scale back to IDR
      
      // Ensure prediction is not negative or ridiculously small
      if (predictedVal < 0 || isNaN(predictedVal)) {
        predictedVal = roll3Mean; // Fallback to moving average
      }
    } catch (err) {
      console.error("Forecasting model error:", err);
      predictedVal = roll3Mean;
    } finally {
      if (inputTensor) inputTensor.dispose();
      if (prediction) prediction.dispose();
    }

    predictedExpenses.push(predictedVal);
    monthlySavingsCapacity.push(monthlyIncome - predictedVal);

    // Push prediction to sliding window for next iteration
    slidingWindow.push({
      totalExpense: predictedVal,
      totalIncome: monthlyIncome,
      monthYear: `${nextYear}-${String(nextMonth).padStart(2, '0')}`
    });
  }

  // 4. Calculate Retirement Metrics (BAB 10)
  // annual_expense = average total_expense of last 12 actual months (or available) * 12
  const actualAggregations = aggregations.length > 0 ? aggregations : history;
  const last12Aggs = actualAggregations.slice(-12);
  const avgActualExpense = last12Aggs.reduce((sum, agg) => sum + agg.totalExpense, 0) / last12Aggs.length;
  const annualExpense = avgActualExpense * 12;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const avgMonthlySavings = monthlySavingsCapacity.reduce((sum, val) => sum + val, 0) / 12;

  const latestAgg = aggregations[aggregations.length - 1];
  const currentTotalBalance = latestAgg ? latestAgg.currentTotalBalance : (user.monthlyIncome || 0);

  const projectedWealth = currentTotalBalance + (avgMonthlySavings * 12 * yearsToRetirement);
  
  // Prevent division by zero
  const pensionSurvivalYears = annualExpense > 0 ? (projectedWealth / annualExpense) : 0;

  // Determine Condition
  let condition = 'bad';
  let recommendedAssetClass = 'Dana darurat, kurangi pengeluaran, reksadana pasar uang';

  if (pensionSurvivalYears > 20) {
    condition = 'good';
    recommendedAssetClass = 'Saham, reksadana saham, campuran';
  } else if (pensionSurvivalYears >= 10) {
    condition = 'normal';
    recommendedAssetClass = 'Obligasi, reksadana pendapatan tetap';
  }

  // 5. Update Database
  // Update User's avatarCondition
  await prisma.user.update({
    where: { id: userId },
    data: { avatarCondition: condition }
  });

  // Upsert AvatarState
  const avatarState = await prisma.avatarState.upsert({
    where: { userId: userId },
    update: {
      condition,
      projectedWealth,
      pensionSurvivalYears,
      recommendedAssetClass,
      predictedExpenseTrend: predictedExpenses,
      lastCalculated: new Date()
    },
    create: {
      userId,
      condition,
      projectedWealth,
      pensionSurvivalYears,
      recommendedAssetClass,
      predictedExpenseTrend: predictedExpenses
    }
  });

  return {
    userId,
    predictedExpenses,
    projectedWealth,
    pensionSurvivalYears,
    condition,
    recommendedAssetClass,
    avatarState
  };
}
