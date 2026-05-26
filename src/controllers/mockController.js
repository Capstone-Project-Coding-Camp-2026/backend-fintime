// src/controllers/mockController.js
import { importMockTransactions } from "../services/mockImportService.js";
import { createMockTransactions } from "../config/utils/mockGenerator.js";
import prisma from "../lib/prisma.js";
export const simulateOtp = (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email wajib diisi untuk pengiriman OTP.",
      });
    }

    res.status(200).json({
      status: "success",
      message: `OTP berhasil dikirim ke ${email} (Simulated)`,
    });
  } catch (error) {
    next(error);
  }
};

export const generateMockTransactions = (req, res, next) => {
  try {
    const transactions = createMockTransactions();

    res.status(200).json({
      status: "success",
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const importTransactions = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    // hapus lama
    await prisma.transaction.deleteMany({
      where: { userId },
    });

    await prisma.aggregation.deleteMany({
      where: { userId },
    });

    // generate mock
    const transactions = createMockTransactions();

    // simpan + NLP classify
    const saved = await importMockTransactions(userId, transactions);

    // aggregation bulanan
    const uniqueMonths = [
      ...new Set(
        transactions.map((t) => {
          const d = new Date(t.date_time);

          return `${d.getFullYear()}-${d.getMonth() + 1}`;
        }),
      ),
    ];

    for (const monthKey of uniqueMonths) {
      const [year, month] = monthKey.split("-");

      await calculateMonthlyAggregation(userId, Number(year), Number(month));
    }

    res.status(200).json({
      success: true,
      imported: saved.length,
    });
  } catch (err) {
    next(err);
  }
};
