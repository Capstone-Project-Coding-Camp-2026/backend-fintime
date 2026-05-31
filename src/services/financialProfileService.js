import prisma from '../lib/prisma.js';
import { calculateRiskScore } from '../utils/finance/calculateRiskScore.js';
import { calculateDebtMetrics } from '../utils/finance/calculateDebtMetrics.js';
import { calculateEmergencyFund } from '../utils/finance/calculateEmergencyFund.js';
import { calculateImpulseSpending } from '../utils/finance/calculateImpulseSpending.js';
import { calculateFinancialLiteracy } from '../utils/finance/calculateFinancialLiteracy.js';
import { calculateBudgetingScore } from '../utils/finance/calculateBudgetingScore.js';
import { calculateInvestmentScore } from '../utils/finance/calculateInvestmentScore.js';
import { calculatePlanningScore } from '../utils/finance/calculatePlanningScore.js';


export async function generateFinancialProfile(userId, baseData = null) {
  const user = baseData?.user || await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const debts = baseData?.debts || await prisma.debt.findMany({ where: { userId, isActive: true } });
  const accounts = baseData?.accounts || await prisma.linkedAccount.findMany({ where: { userId, isActive: true } });

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const transactions = baseData?.transactions || await prisma.transaction.findMany({
    where: {
      userId,
      dateTime: { gte: ninetyDaysAgo }
    }
  });

  const goals = baseData?.goals || await prisma.goal.findMany({ where: { userId } });
  const investments = baseData?.investments || await prisma.investment.findMany({ where: { userId } });
  const budgets = baseData?.budgets || await prisma.budget.findMany({ where: { userId } });

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const monthlyIncome = user.monthlyIncome || 0;
  const monthlyExpenses = user.monthlyExpenses || 0;

  const debtMetrics = calculateDebtMetrics(debts, monthlyIncome);
  const monthlyFixedExpenses = monthlyExpenses + debtMetrics.monthlyDebtPayments;
  const emergencyFund = calculateEmergencyFund(totalBalance, monthlyFixedExpenses);
  const impulseSpendingTendency = calculateImpulseSpending(transactions);
  const savingsRate = monthlyIncome > 0 ? Number(((monthlyIncome - monthlyExpenses) / monthlyIncome).toFixed(2)) : 0;

  const budgetingScore = calculateBudgetingScore(budgets);
  const investmentScore = calculateInvestmentScore(investments);
  const planningScore = calculatePlanningScore(goals);

  const financialLiteracyScore = calculateFinancialLiteracy({
    hasEmergencyFund: emergencyFund.hasEmergencyFund,
    savingsRate,
    hasInvestments: investments.some(i => i.isActive),
    hasGoals: goals.some(g => g.isActive),
    pinjolActive: debtMetrics.pinjolActive,
    debtToIncomeRatio: debtMetrics.debtToIncomeRatio,
    impulseSpendingTendency
  });

  const postPurchaseCashflow = monthlyIncome - monthlyExpenses - debtMetrics.monthlyDebtPayments;
  const riskProfile = calculateRiskScore({
    debtToIncomeRatio: debtMetrics.debtToIncomeRatio,
    emergencyFundMonths: emergencyFund.emergencyFundMonths,
    postPurchaseCashflow,
    savingsRate,
  });

  const insights = generateInsights({
    debtMetrics,
    emergencyFund,
    savingsRate,
    impulseSpendingTendency,
    budgetingScore,
    monthlyIncome,
    monthlyExpenses,
  });

  return {
    userProfile: user,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    debtMetrics,
    emergencyFund,
    impulseSpendingTendency,
    savingsRate,
    financialLiteracyScore,
    budgetingScore,
    investmentScore,
    planningScore,
    riskProfile,
    insights,
    hasGoals: goals.some(g => g.isActive),
    hasInvestments: investments.some(i => i.isActive),
  };
}

function computeRiskProfile({ debtToIncomeRatio, emergencyFundMonths, savingsRate, pinjolActive, impulseSpendingTendency }) {
  let riskScore = 0; 
 
  if (debtToIncomeRatio > 0.4) riskScore += 3;
  else if (debtToIncomeRatio > 0.25) riskScore += 2;
  else if (debtToIncomeRatio > 0.1) riskScore += 1;


  if (emergencyFundMonths < 1) riskScore += 3;
  else if (emergencyFundMonths < 3) riskScore += 2;
  else if (emergencyFundMonths < 6) riskScore += 1;


  if (savingsRate < 0) riskScore += 3;
  else if (savingsRate < 0.1) riskScore += 2;
  else if (savingsRate < 0.2) riskScore += 1;


  if (pinjolActive) riskScore += 2;

  if (impulseSpendingTendency === 'high') riskScore += 2;
  else if (impulseSpendingTendency === 'medium') riskScore += 1;

  if (riskScore >= 7) return { level: 'risky', score: riskScore, label: 'Berisiko Tinggi', color: '#f87171' };
  if (riskScore >= 4) return { level: 'moderate', score: riskScore, label: 'Perlu Waspada', color: '#fbbf24' };
  return { level: 'safe', score: riskScore, label: 'Aman', color: '#4ade80' };
}

function generateInsights({ debtMetrics, emergencyFund, savingsRate, impulseSpendingTendency, budgetingScore, monthlyIncome, monthlyExpenses }) {
  const insights = [];

 
  if (debtMetrics.debtToIncomeRatio > 0.35) {
    insights.push({
      type: 'warning',
      icon: 'AlertTriangle',
      title: 'Rasio Utang Tinggi',
      message: `Rasio utang terhadap pendapatan kamu ${(debtMetrics.debtToIncomeRatio * 100).toFixed(0)}%. Idealnya di bawah 30%.`,
      action: 'Prioritaskan pelunasan utang berbunga tinggi terlebih dahulu.'
    });
  }

  
  if (emergencyFund.emergencyFundMonths < 3) {
    insights.push({
      type: 'warning',
      icon: 'Shield',
      title: 'Dana Darurat Belum Cukup',
      message: `Dana darurat kamu hanya cukup untuk ${emergencyFund.emergencyFundMonths} bulan. Targetkan minimal 3 bulan.`,
      action: 'Sisihkan 10-20% penghasilan untuk membangun dana darurat.'
    });
  } else if (emergencyFund.emergencyFundMonths >= 6) {
    insights.push({
      type: 'positive',
      icon: 'CheckCircle',
      title: 'Dana Darurat Sehat',
      message: `Dana darurat kamu cukup untuk ${emergencyFund.emergencyFundMonths} bulan. Sangat baik!`,
      action: 'Pertimbangkan untuk mulai berinvestasi dengan kelebihan dana.'
    });
  }

  // Savings rate insight
  if (savingsRate < 0) {
    insights.push({
      type: 'danger',
      icon: 'AlertCircle',
      title: 'Pengeluaran Melebihi Pendapatan',
      message: 'Kamu menghabiskan lebih dari yang kamu hasilkan. Ini sangat berisiko.',
      action: 'Segera kurangi pengeluaran non-esensial dan buat anggaran ketat.'
    });
  } else if (savingsRate < 0.1) {
    insights.push({
      type: 'warning',
      icon: 'Wallet',
      title: 'Tabungan Terlalu Rendah',
      message: `Tingkat tabungan kamu hanya ${(savingsRate * 100).toFixed(0)}%. Idealnya minimal 20%.`,
      action: 'Terapkan metode 50/30/20 untuk mengatur keuangan.'
    });
  }

  // Impulse spending insight
  if (impulseSpendingTendency === 'high') {
    insights.push({
      type: 'warning',
      icon: 'ShoppingCart',
      title: 'Perilaku Belanja Impulsif',
      message: 'Lebih dari 40% pengeluaranmu berada di kategori hiburan dan belanja.',
      action: 'Terapkan waiting period 48 jam sebelum membeli barang non-esensial.'
    });
  }

  // Pinjol warning
  if (debtMetrics.pinjolActive) {
    insights.push({
      type: 'danger',
      icon: 'BellRing',
      title: 'Pinjaman Online Aktif',
      message: 'Pinjaman online memiliki bunga sangat tinggi yang bisa menjerat.',
      action: 'Lunasi pinjol sesegera mungkin, ini prioritas utama.'
    });
  }

  // Budgeting encouragement
  if (budgetingScore === 0) {
    insights.push({
      type: 'info',
      icon: 'BarChart3',
      title: 'Belum Memiliki Anggaran',
      message: 'Membuat anggaran adalah langkah pertama mengelola keuangan dengan baik.',
      action: 'Buat anggaran bulanan untuk kategori utama pengeluaranmu.'
    });
  }

  // Cashflow insight
  const monthlyCashflow = monthlyIncome - monthlyExpenses - debtMetrics.monthlyDebtPayments;
  if (monthlyCashflow > 0 && insights.length < 2) {
    insights.push({
      type: 'positive',
      icon: 'TrendingUp',
      title: 'Cashflow Positif',
      message: `Kamu memiliki surplus Rp ${Math.round(monthlyCashflow).toLocaleString('id-ID')} per bulan.`,
      action: 'Manfaatkan surplus ini untuk investasi atau tabungan goal.'
    });
  }

  return insights;
}
