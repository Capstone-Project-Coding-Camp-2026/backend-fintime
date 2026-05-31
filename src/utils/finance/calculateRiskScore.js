
function normalize(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

/**
* Menghitung skor risiko
 * @param {Object} params
 * @param {number} params.debtToIncomeRatio          
 * @param {number} params.emergencyFundMonths       
 * @param {number} params.postPurchaseCashflow       
 * @param {number} params.savingsRate                
 * @returns {number} 
 */
export function calculateRiskScore({
  debtToIncomeRatio,
  emergencyFundMonths,
  postPurchaseCashflow,
  savingsRate,
}) {
  // Pembagian bobot (harus berjumlah 1)
  const weights = {
    debtToIncomeRatio: 0.30,
    emergencyFundMonths: 0.20,
    postPurchaseCashflow: 0.30,
    savingsRate: 0.20,
  };

  // Rentang normalisasi – ini heuristik dan dapat disesuaikan nanti.
  const dtiScore = normalize(debtToIncomeRatio, 0, 0.6);
  const efScore = 1 - normalize(emergencyFundMonths, 3, 12); 
  const cashflowScore = normalize(-postPurchaseCashflow, -5000000, 0); 
  const savingsScore = 1 - normalize(savingsRate, 0, 0.5); 

  
  const weightedRisk =
    dtiScore * weights.debtToIncomeRatio +
    efScore * weights.emergencyFundMonths +
    cashflowScore * weights.postPurchaseCashflow +
    savingsScore * weights.savingsRate;

  
  const score = Math.round(weightedRisk * 10 * 10) / 10;

  let level = 'safe';
  let label = 'Aman';
  let color = '#4ade80';

  if (score >= 7) {
    level = 'risky';
    label = 'Berisiko Tinggi';
    color = '#f87171';
  } else if (score >= 4) {
    level = 'moderate';
    label = 'Perlu Waspada';
    color = '#fbbf24';
  }

  return {
    level,
    score,
    label,
    color,
  };
}

export default calculateRiskScore;
