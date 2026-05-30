// Menghitung skor risiko berdasarkan debt-to-income ratio, emergency fund months, post-purchase cashflow, dan savings rate

/**
 * Normalisasi nilai ke rentang 0-1
 * Nilai di luar rentang akan dibatasi
 */
function normalize(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

/**
* Menghitung skor risiko
 * @param {Object} params
 * @param {number} params.debtToIncomeRatio          // contoh 0.4 (40%)
 * @param {number} params.emergencyFundMonths        // contoh 3 bulan
 * @param {number} params.postPurchaseCashflow       // contoh -5000000
 * @param {number} params.savingsRate                // contoh 0.2
 * @returns {number} risk score dari 0 (no risk) hingga 100 (maximum risk)
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
  const dtiScore = normalize(debtToIncomeRatio, 0, 0.6); // >60% dianggap berisiko tinggi
  const efScore = 1 - normalize(emergencyFundMonths, 3, 12); // <3 bulan berisiko, >12 bulan aman
  const cashflowScore = normalize(-postPurchaseCashflow, -5000000, 0); // cashflow negatif berisiko
  const savingsScore = 1 - normalize(savingsRate, 0, 0.5); // tabungan rendah berisiko

  // Weighted sum – semakin tinggi semakin berisiko.
  const weightedRisk =
    dtiScore * weights.debtToIncomeRatio +
    efScore * weights.emergencyFundMonths +
    cashflowScore * weights.postPurchaseCashflow +
    savingsScore * weights.savingsRate;

  // Scale ke 0-10 untuk UI
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
