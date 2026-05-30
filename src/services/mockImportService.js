import prisma from "../lib/prisma.js";
import { classifyTransactionAI } from "./aiApiService.js";

export async function importMockTransactions(userId, transactions) {
  console.log("USER:", userId);
  console.log("TOTAL GENERATED:", transactions.length);
  console.log("FIRST TX:", transactions[0]);

  const savedTransactions = [];

  for (const trx of transactions) {
    let categoryLabel = "lainnya";
    let confidence = 0;

    try {
      // NLP classify
      const aiResult = await classifyTransactionAI(trx.description);

      categoryLabel = aiResult?.predicted_category || "lainnya";

      confidence = aiResult?.confidence || 0;

      if (confidence < 0.7) {
        categoryLabel = "lainnya";
      }
    } catch (err) {
      console.error("AI classify failed:", err.message);
    }

    const saved = await prisma.transaction.create({
      data: {
        userId,

        amount: trx.amount,

        description: trx.description,

        categoryLabel,

        confidence,

        transactionType: trx.transactionType,

        paymentMethod: trx.paymentMethod,

        source: trx.source,

        dateTime: new Date(trx.dateTime),

        isLabelled: categoryLabel !== "lainnya",
      },
    });

    // Update budget spent if applicable
    if (categoryLabel !== "lainnya" && trx.transactionType === "debit") {
      const budget = await prisma.budget.findFirst({
        where: {
          userId,
          category: {
            equals: categoryLabel,
            mode: "insensitive",
          },
          period: "monthly",
          isActive: true,
        },
      });

      if (budget) {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { spent: { increment: trx.amount } },
        });
      }
    }

    savedTransactions.push(saved);
  }

  console.log("SAVED:", savedTransactions.length);

  const totalTx = await prisma.transaction.count({
    where: { userId },
  });

  console.log("TOTAL IN DB:", totalTx);

  return savedTransactions;
}
