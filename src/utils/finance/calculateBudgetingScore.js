/**
 * Menghitung skor kedisiplinan anggaran berdasarkan data anggaran pengguna.
 * @param {Array} budgets - Anggaran aktif dari DB
 * @returns {number} Skor 0-100
 */
export function calculateBudgetingScore(budgets) {
  if (!budgets || budgets.length === 0) return 0;

  let score = 30; // Base: pengguna setidaknya memiliki set budget
  const activeBudgets = budgets.filter(b => b.isActive);
  if (activeBudgets.length === 0) return 0;

  // Lebih banyak kategori anggaran = lebih disiplin (+5 per kategori, maks +20)
  score += Math.min(activeBudgets.length * 5, 20);

  // Memeriksa overspending: berapa banyak anggaran yang di bawah limit?
  let underBudgetCount = 0;
  for (const b of activeBudgets) {
    if (b.spent <= b.limit) {
      underBudgetCount++;
    }
  }

  const adherenceRate = underBudgetCount / activeBudgets.length;
  // Tingkat kedisiplinan yang baik: +30, parsial: +15, buruk: +0
  if (adherenceRate >= 0.8) score += 30;
  else if (adherenceRate >= 0.5) score += 15;

  // Rata-rata utilisasi total adalah tanda awareness
  const avgUtilization = activeBudgets.reduce((sum, b) => sum + (b.limit > 0 ? b.spent / b.limit : 0), 0) / activeBudgets.length;
  if (avgUtilization > 0.3 && avgUtilization < 0.9) score += 20; // Penggunaan aktif, bukan overspending

  return Math.min(Math.max(score, 0), 100);
}
