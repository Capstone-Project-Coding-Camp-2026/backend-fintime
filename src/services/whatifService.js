import prisma from "../lib/prisma.js";
import { whatIfAI } from "./aiApiService.js";
import { buildWhatIfPayload } from "../config/utils/buildWhatIfPayload.js";

export const runWhatIfAnalysis = async ({
  userId,
  itemPrice,
  selectedOption,
  installmentMonths,
  interestRate,
}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }
  const accounts = await prisma.linkedAccount.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.balance || 0),
    0,
  );

  const monthlyIncome = user.monthlyIncome || 0;
  const monthlyExpense = user.monthlyExpense || 0;

  const aiPayload = buildWhatIfPayload({
    user,
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    selectedOption,
    installmentMonths,
    interestRate,
    itemPrice,
  });

  const aiResult = await whatIfAI(aiPayload);

  const tenor = aiPayload.simulation.paylater_tenor_months;

  const installment =
    aiResult.financial_impact?.paylater_monthly_installment || 0;

  return {
    ...aiResult,

    monthly_payment: installment,

    total_payment:
      tenor > 1 ? installment * tenor : aiPayload.simulation.item_price,
  };
};
