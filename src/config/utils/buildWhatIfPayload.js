export const buildWhatIfPayload = ({
  profile,
  selectedOption,
  installmentMonths,
  interestRate,
  itemPrice,
}) => {
  const {
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
  } = profile;

  // Calculate age safely
  let userAge = 25 // default
  if (user.birthDate) {
    const birth = new Date(user.birthDate)
    const today = new Date()
    userAge = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      userAge--
    }
  }

  return {
    user_profile: {
      age: userAge,
      total_income: monthlyIncome,
      monthly_expenses: Math.round(monthlyExpenses),
      current_savings: totalBalance,

      has_emergency_fund: emergencyFund.hasEmergencyFund,
      emergency_fund_months: Math.round(emergencyFund.emergencyFundMonths),

      has_kpr: debtMetrics.hasKpr,
      has_vehicle_credit: debtMetrics.hasVehicleCredit,
      pinjol_active: debtMetrics.pinjolActive,
      total_debt: debtMetrics.totalDebt,
      debt_to_income_ratio: debtMetrics.debtToIncomeRatio,

      credit_card_utilization: debtMetrics.creditCardUtilization,
      financial_literacy_score: financialLiteracyScore,

      employment_type: user.jobType || 'permanent',
      city_tier: 'tier_2',

      paylater_usage_history: selectedOption === 'paylater' ? 'medium' : 'low',

      impulse_spending_tendency: impulseSpendingTendency,

      savings_rate: savingsRate,
    },

    simulation: {
      item_price: itemPrice,
      available_cash: totalBalance,
      paylater_interest_rate: selectedOption === 'paylater' ? Math.round(parseFloat(interestRate)) : 0,
      paylater_tenor_months: selectedOption === 'paylater' ? Math.round(parseFloat(installmentMonths)) : 1,
    },
  }
}
