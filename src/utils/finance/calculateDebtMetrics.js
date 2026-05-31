export function calculateDebtMetrics(debts, monthlyIncome) {
  let totalDebt = 0;
  let monthlyDebtPayments = 0;
  let cardRemainingDebt = 0;
  let estimatedCardLimit = 0;
  
  let hasKpr = 0;
  let hasVehicleCredit = 0;
  let pinjolActive = 0;

  for (const debt of debts) {
    if (debt.isActive) {
      totalDebt += debt.remainingAmount || 0;
      monthlyDebtPayments += debt.monthlyPayment || 0;

      if (debt.debtType === 'kpr') hasKpr = 1;
      if (debt.debtType === 'vehicle') hasVehicleCredit = 1;
      if (debt.debtType === 'pinjol') pinjolActive = 1;

      if (debt.debtType === 'card') {
        cardRemainingDebt += debt.remainingAmount || 0;
        estimatedCardLimit += monthlyIncome * 3; 
      }
    }
  }

  const debtToIncomeRatio = monthlyIncome > 0 ? Number((monthlyDebtPayments / monthlyIncome).toFixed(2)) : 0;
  const creditCardUtilization = estimatedCardLimit > 0 ? Number((cardRemainingDebt / estimatedCardLimit).toFixed(2)) : 0;

  return {
    totalDebt,
    monthlyDebtPayments,
    debtToIncomeRatio,
    creditCardUtilization,
    hasKpr,
    hasVehicleCredit,
    pinjolActive,
  };
}
