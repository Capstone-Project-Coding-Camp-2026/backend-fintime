/**
 * Menghitung skor kedisiplinan anggaran berdasarkan data anggaran pengguna.
 * @param {Array} budgets 
 * @returns {number} 
 */
export function calculateBudgetingScore(budgets) {
  if (!budgets || budgets.length === 0) return 0;

  let score = 30; 
  const activeBudgets = budgets.filter(b => b.isActive);
  if (activeBudgets.length === 0) return 0;

  score += Math.min(activeBudgets.length * 5, 20);

  // Memeriksa overspending: berapa banyak anggaran yang di bawah limit?
  let underBudgetCount = 0;
  for (const b of activeBudgets) {
    if (b.spent <= b.limit) {
      underBudgetCount++;
    }
  }

  const adherenceRate = underBudgetCount / activeBudgets.length;
  if (adherenceRate >= 0.8) score += 30;
  else if (adherenceRate >= 0.5) score += 15;

 
  const avgUtilization = activeBudgets.reduce((sum, b) => sum + (b.limit > 0 ? b.spent / b.limit : 0), 0) / activeBudgets.length;
  if (avgUtilization > 0.3 && avgUtilization < 0.9) score += 20; 

  return Math.min(Math.max(score, 0), 100);
}
