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

  return await whatIfAI(aiPayload);
};
