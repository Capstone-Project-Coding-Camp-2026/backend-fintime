import prisma from "../lib/prisma.js";
import { classifyTransactionAI } from "./aiApiService.js";
import { calculateMonthlyAggregation } from "./aggregationService.js";

export async function importMockTransactions(userId, transactions) {
  console.log("USER:", userId);
  console.log("TOTAL GENERATED:", transactions.length);
  console.log("FIRST TX:", transactions[0]);

  const savedTransactions = [];

  // Fetch user for auto-label rules
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { labelRules: true }
  });
  const labelRules = user?.labelRules && Array.isArray(user.labelRules) ? user.labelRules : [];

  for (const trx of transactions) {
    let categoryLabel = "lainnya";
    let confidence = 0;

    // 0. Cek Auto-Label Rules pengguna terlebih dahulu
    const matchedRule = labelRules.find(r => 
      trx.description && trx.description.toLowerCase().includes(r.match.toLowerCase())
    );

    if (matchedRule) {
      categoryLabel = matchedRule.category;
      confidence = 1.0;
    } else {

    try {
      // NLP classify
      const aiResult = await classifyTransactionAI(trx.description);

      categoryLabel = aiResult?.predicted_category || "lainnya";

      confidence = aiResult?.confidence || 0;
    } catch (err) {
      console.error("AI classify failed:", err.message);
    }
    } // <-- Close else block for matchedRule

    // 1. Tangani perbedaan snake_case (AI) vs camelCase (Prisma)
    // 2. Sanitasi transaction_type (ubah 'transfer' jadi 'debit')
    const rawType = (trx.transaction_type || trx.transactionType || 'debit').toLowerCase();
    const safeType = rawType === 'transfer' ? 'debit' : rawType;

    // 3. Sanitasi huruf besar/kecil di paymentMethod dan source
    const safePaymentMethod = (trx.payment_method || trx.paymentMethod || 'tunai').toLowerCase();
    const safeSource = (trx.source || 'lainnya').toLowerCase();

    // 4. Tangani date_time vs dateTime
    const safeDateTime = new Date(trx.date_time || trx.dateTime || new Date());

    const saved = await prisma.transaction.create({
      data: {
        userId,
        amount: trx.amount,
        description: trx.description,
        categoryLabel,
        confidence,
        transactionType: safeType,
        paymentMethod: safePaymentMethod,
        source: safeSource,
        dateTime: safeDateTime,
        isLabelled: categoryLabel !== "lainnya",
      },
    });

    savedTransactions.push(saved);
  }

  console.log("SAVED:", savedTransactions.length);

  const totalTx = await prisma.transaction.count({
    where: { userId },
  });

  console.log("TOTAL IN DB:", totalTx);

  // Auto Recalculate Aggregation untuk setiap bulan yang terpengaruh
  const uniqueMonths = new Set();
  for (const trx of transactions) {
    const d = new Date(trx.date_time || trx.dateTime || new Date());
    uniqueMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  }

  for (const my of uniqueMonths) {
    const [y, m] = my.split('-');
    await calculateMonthlyAggregation(userId, parseInt(y), parseInt(m));
  }
  
  console.log("AGGREGATION RECALCULATED FOR:", Array.from(uniqueMonths));

  return savedTransactions;
}
