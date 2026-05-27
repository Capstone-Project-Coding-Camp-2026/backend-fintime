export const buildWhatIfPayload = ({
  user,
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  selectedOption,
  installmentMonths,
  interestRate,
  itemPrice,
}) => {
  // Calculate age safely
  let userAge = 25; // default
  if (user.birthDate) {
    const birth = new Date(user.birthDate);
    const today = new Date();
    userAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      userAge--;
    }
  }

  return {
    user_profile: {
      age: userAge,
      total_income: monthlyIncome,
      monthly_expenses: monthlyExpense,
      current_savings: totalBalance,

      has_emergency_fund: totalBalance >= monthlyExpense * 3 ? 1 : 0,

      emergency_fund_months:
        monthlyExpense > 0 ? Math.round(totalBalance / monthlyExpense) : 0,

      has_kpr: 0,
      has_vehicle_credit: 0,
      pinjol_active: 0,
      total_debt: 0,

      credit_card_utilization: 0.2,
      financial_literacy_score: 70,

      employment_type: "full_time",
      city_tier: "tier_2",

      paylater_usage_history: selectedOption === "paylater" ? "medium" : "low",

      impulse_spending_tendency: "medium",

      savings_rate:
        monthlyIncome > 0
          ? Number(
              ((monthlyIncome - monthlyExpense) / monthlyIncome).toFixed(2),
            )
          : 0,
    },

    simulation: {
      item_price: itemPrice,

      available_cash: totalBalance,

      paylater_interest_rate:
        selectedOption === "paylater" ? parseFloat(interestRate) / 100 : 0,

      paylater_tenor_months:
        selectedOption === "paylater" ? parseInt(installmentMonths) : 1,
    },
  };
};
