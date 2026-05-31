export function calculateImpulseSpending(transactions) {
  let totalSpending = 0;
  let impulseSpending = 0;

  for (const t of transactions) {
    if (t.transactionType === 'debit' && t.categoryLabel !== 'transfer_internal' && t.categoryLabel !== 'topup_ewallet') {
      totalSpending += t.amount;
      
      const cat = t.categoryLabel?.toLowerCase();
      if (cat === 'hiburan' || cat === 'belanja') {
        impulseSpending += t.amount;
      }
    }
  }

  if (totalSpending === 0) return 'low';

  const impulseRatio = impulseSpending / totalSpending;

  if (impulseRatio > 0.4) return 'high';
  if (impulseRatio >= 0.2) return 'medium';
  return 'low';
}
