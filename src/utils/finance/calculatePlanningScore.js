/**
 * @param {Array} goals - 
 * @returns {number} 
 */
export function calculatePlanningScore(goals) {
  if (!goals || goals.length === 0) return 0;

  let score = 20; 

  const active = goals.filter(g => g.isActive);
  if (active.length === 0) return 0;

  
  score += Math.min(active.length * 10, 20);


  if (active.some(g => g.category === 'emergency_fund')) score += 15;

 
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

    score += Math.round(avgProgress * 30); // max +30
  }

  const completedCount = goals.filter(g => g.isCompleted).length;
  if (completedCount > 0) score += Math.min(completedCount * 5, 15);

  return Math.min(Math.max(score, 0), 100);
}
