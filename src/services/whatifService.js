import { whatIfAI } from './aiApiService.js'
import { buildWhatIfPayload } from '../config/utils/buildWhatIfPayload.js'
import { generateFinancialProfile } from './financialProfileService.js'

export const runWhatIfAnalysis = async ({
  userId,
  itemPrice,
  selectedOption,
  installmentMonths,
  interestRate,
}) => {
  // Generate financial profile
  const profile = await generateFinancialProfile(userId)

  const aiPayload = buildWhatIfPayload({
    profile,
    selectedOption,
    installmentMonths,
    interestRate,
    itemPrice,
  })

  console.log('WHATIF PAYLOAD:', JSON.stringify(aiPayload, null, 2))
  const aiResult = await whatIfAI(aiPayload)

  const tenor = aiPayload.simulation.paylater_tenor_months
  const installment = aiResult.financial_impact?.paylater_monthly_installment || 0

  return {
    ...aiResult,
    monthly_payment: installment,
    total_payment: tenor > 1 ? installment * tenor : aiPayload.simulation.item_price,
    financial_profile: {
      riskProfile: profile.riskProfile,
      insights: profile.insights,
      scores: {
        financialLiteracy: profile.financialLiteracyScore,
        budgeting: profile.budgetingScore,
        investment: profile.investmentScore,
        planning: profile.planningScore,
      },
      metrics: {
        debtToIncomeRatio: profile.debtMetrics.debtToIncomeRatio,
        emergencyFundMonths: profile.emergencyFund.emergencyFundMonths,
        hasEmergencyFund: profile.emergencyFund.hasEmergencyFund,
        savingsRate: profile.savingsRate,
        impulseSpendingTendency: profile.impulseSpendingTendency,
        totalDebt: profile.debtMetrics.totalDebt,
        pinjolActive: profile.debtMetrics.pinjolActive,
        creditCardUtilization: profile.debtMetrics.creditCardUtilization,
      },
    },
  }
}
