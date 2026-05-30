export function calculateEmergencyFund(totalBalance, monthlyFixedExpenses) {
  const hasEmergencyFund = totalBalance >= monthlyFixedExpenses * 3 ? 1 : 0;
  const emergencyFundMonths = monthlyFixedExpenses > 0 ? Number((totalBalance / monthlyFixedExpenses).toFixed(1)) : 0;

  return {
    hasEmergencyFund,
    emergencyFundMonths,
  };
}
