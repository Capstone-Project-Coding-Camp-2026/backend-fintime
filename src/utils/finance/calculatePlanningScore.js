/**
 * Menghitung skor perencanaan keuangan berdasarkan tujuan pengguna.
 * @param {Array} goals - Tujuan aktif dari DB
 * @returns {number} Skor 0-100
 */
export function calculatePlanningScore(goals) {
  if (!goals || goals.length === 0) return 0;

  let score = 20; // Base: user telah menetapkan setidaknya satu tujuan

  const active = goals.filter(g => g.isActive);
  if (active.length === 0) return 0;

  // Lebih banyak tujuan = perencanaan lebih baik (+10 per tujuan, maks +20)
  score += Math.min(active.length * 10, 20);

  // Punya dana darurat? (+15)
  if (active.some(g => g.category === 'emergency_fund')) score += 15;

  // Rata-rata progres di semua Goals
  let totalProgress = 0;
  let goalsWithTarget = 0;
  for (const g of active) {
    if (g.targetAmount > 0) {
      totalProgress += Math.min(g.currentAmount / g.targetAmount, 1);
      goalsWithTarget++;
    }
  }

  if (goalsWithTarget > 0) {
    const avgProgress = totalProgress / goalsWithTarget;
    // High progress = disiplin menabung
    score += Math.round(avgProgress * 30); // max +30
  }

  // Bonus untuk Goals yang Selesai
  const completedCount = goals.filter(g => g.isCompleted).length;
  if (completedCount > 0) score += Math.min(completedCount * 5, 15);

  return Math.min(Math.max(score, 0), 100);
}
