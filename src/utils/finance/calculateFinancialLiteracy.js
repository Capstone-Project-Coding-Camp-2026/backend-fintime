export function calculateFinancialLiteracy({
  hasEmergencyFund,
  savingsRate,
  hasInvestments,
  hasGoals,
  pinjolActive,
  debtToIncomeRatio,
  impulseSpendingTendency
}) {
  let score = 50; 

  // Positives
  if (hasEmergencyFund) score += 10;
  if (hasInvestments) score += 10;
  if (hasGoals) score += 10;
  if (savingsRate > 0.2) score += 10;

  // Negatives
  if (pinjolActive) score -= 15;
  if (debtToIncomeRatio > 0.35) score -= 10;
  
  if (impulseSpendingTendency === 'high') score -= 10;
  if (impulseSpendingTendency === 'low') score += 10;


  return Math.min(Math.max(score, 0), 100);
}
