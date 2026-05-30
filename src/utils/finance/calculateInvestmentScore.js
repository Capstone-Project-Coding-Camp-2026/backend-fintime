/**
 * Menghitung skor investasi berdasarkan portofolio investasi pengguna.
 * @param {Array} investments - Investasi aktif dari DB
 * @returns {number} Skor 0-100
 */
export function calculateInvestmentScore(investments) {
  if (!investments || investments.length === 0) return 0;

  let score = 20; // Base: user telah berinvestasi

  const active = investments.filter(i => i.isActive);
  if (active.length === 0) return 0;

  // Bonus diversifikasi: lebih banyak jenis = lebih baik (+10 per jenis unik, maks +30)
  const uniqueTypes = new Set(active.map(i => i.type));
  score += Math.min(uniqueTypes.size * 10, 30);

  // Bonus nilai total portofolio
  const totalValue = active.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  if (totalValue >= 50_000_000) score += 20;      // >50jt
  else if (totalValue >= 10_000_000) score += 10;  // >10jt

  // Bonus keuntungan positif
  const totalInitial = active.reduce((sum, i) => sum + (i.initialAmount || 0), 0);
  if (totalInitial > 0 && totalValue > totalInitial) {
    score += 20; // Portofolio untung
  }

  return Math.min(Math.max(score, 0), 100);
}
