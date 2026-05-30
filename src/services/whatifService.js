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

  // Phase 2: Compute alternative scenarios
  const alternativeScenarios = [
    { name: 'Tunai', option: 'cash', tenor: 1 },
    { name: 'PayLater 6 Bulan', option: 'paylater', tenor: 6 },
    { name: 'PayLater 12 Bulan', option: 'paylater', tenor: 12 },
  ];

  const alternatives = await Promise.all(
    alternativeScenarios.map(async (alt) => {
      const altPayload = buildWhatIfPayload({
        profile,
        selectedOption: alt.option,
        installmentMonths: alt.tenor,
        interestRate,
        itemPrice,
      });
      try {
        const res = await whatIfAI(altPayload);
        const altInstallment = res.financial_impact?.paylater_monthly_installment || 0;
        return {
          name: alt.name,
          recommendation: res.recommendation,
          monthly_payment: altInstallment,
          total_payment: alt.tenor > 1 ? altInstallment * alt.tenor : itemPrice,
        };
      } catch (err) {
        return null;
      }
    })
  );

  return {
    ...aiResult,
    monthly_payment: installment,
    total_payment: tenor > 1 ? installment * tenor : aiPayload.simulation.item_price,
    alternatives: alternatives.filter(Boolean),
    // Phase 2: Include profile data for frontend UI
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
