// src/controllers/mockController.js
import { importMockTransactions } from "../services/mockImportService.js";
import { createMockTransactions } from "../config/utils/mockGenerator.js";
import { calculateMonthlyAggregation } from "../services/aggregationService.js";
import { classifyTransactionAI } from "../services/aiApiService.js";
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
          const d = new Date(t.dateTime);
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
      message: "Mock transactions imported successfully",
      imported: saved.length,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================================
// ASYNCHRONOUS BACKGROUND JOB 
// ==========================================================
export const runAsyncMockBuilder = async (userId, monthlyIncome, jobType, linkedAccounts = []) => {
  try {
    console.log(`\n[BACKGROUND JOB] Memulai mock untuk User: ${userId} | Profesi: ${jobType}`);

    // Panggil generator
    const rawTransactions = createMockTransactions(jobType, monthlyIncome, linkedAccounts);

    // ==========================================================
    // AI BATCH PROCESSING
    // ==========================================================
    const unlabelledDesc = rawTransactions
      .filter(tx => tx.categoryLabel === null)
      .map(tx => tx.description);
    
    const uniqueDescriptions = [...new Set(unlabelledDesc)];
    console.log(`[BACKGROUND JOB] Meminta AI di Railway memproses ${uniqueDescriptions.length} teks unik...`);

    const aiDictionary = {};
    const BATCH_SIZE = 5; 
    const AUTO_LABEL_THRESHOLD = 0.85;
    
    for (let i = 0; i < uniqueDescriptions.length; i += BATCH_SIZE) {
      const batch = uniqueDescriptions.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (desc) => {
          try {
            const aiResult = await classifyTransactionAI(desc);
            return { 
              desc, 
              category: aiResult.predicted_category || "lainnya",
              confidence: aiResult.confidence || 0
            };
          } catch (err) {
            console.warn(`[AI WARN] Gagal prediksi "${desc}", fallback ke "lainnya".`);
            return { desc, category: "lainnya", confidence: 0 };
          }
        })
      );

      batchResults.forEach(res => {
        aiDictionary[res.desc] = { category: res.category, confidence: res.confidence };
      });
    }
    console.log(`[BACKGROUND JOB] Batching AI selesai! Kamus kategori siap digunakan.`);

    // Bersihkan data (Sanitize)
    const sanitizedTransactions = rawTransactions.map(tx => {
      let safeType = (tx.transactionType || 'debit').toLowerCase();
      if (safeType === 'transfer') safeType = 'debit'; 

      let finalCategoryLabel = tx.categoryLabel;
      let finalConfidence = 1.0;
      let isFinalLabelled = true;

      // Jika categoryLabel null, berarti data ini dikirimkan ke AI
      if (tx.categoryLabel === null) {
        const aiData = aiDictionary[tx.description] || { category: "lainnya", confidence: 0 };
        finalCategoryLabel = aiData.category;
        finalConfidence = aiData.confidence;
        
        // Logika Thresholding AI Asli
        if (finalCategoryLabel === "lainnya" || finalConfidence < AUTO_LABEL_THRESHOLD) {
            isFinalLabelled = false; 
        }

        // Trik Cerdasmu (Opsional: Hapus blok ini nanti jika aplikasimu sudah rilis/Production)
        /*
        if (Math.random() < 0.2) {
          finalCategoryLabel = 'lainnya';
          isFinalLabelled = false;
          finalConfidence = 0.0;
        }
        */
      }

      return {
        userId: userId,
        dateTime: new Date(tx.dateTime),
        description: tx.description || 'Transaksi',
        amount: parseFloat(tx.amount || 0),
        transactionType: safeType,
        paymentMethod: tx.paymentMethod ? tx.paymentMethod.toLowerCase() : 'tunai',
        source: tx.source ? String(tx.source).toLowerCase() : 'lainnya',
        categoryLabel: finalCategoryLabel,
        isLabelled: isFinalLabelled, 
        confidence: finalConfidence 
      };
    });

    // Batch Insert ke PostgreSQL
    await prisma.transaction.createMany({
      data: sanitizedTransactions,
      skipDuplicates: true
    });
    console.log(`[BACKGROUND JOB] ${sanitizedTransactions.length} transaksi berhasil disimpan!`);

    // KALKULASI SALDO AKUN
    const balances = {};
    sanitizedTransactions.forEach(tx => {
      if (!balances[tx.source]) balances[tx.source] = 0;
      if (tx.transactionType === 'credit') balances[tx.source] += tx.amount;
      else if (tx.transactionType === 'debit') balances[tx.source] -= tx.amount;
    });

    const ewalletList = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];
    const nameMap = { bca: "BCA", mandiri: "Mandiri", gopay: "GoPay", ovo: "OVO", dana: "DANA", shopeepay: "ShopeePay" };

    for (const [source, balance] of Object.entries(balances)) {
      const type = ewalletList.includes(source) ? 'ewallet' : 'bank';
      const accountName = nameMap[source] || source.toUpperCase();
      const finalBalance = Math.max(0, balance); 

      const existingAccount = await prisma.linkedAccount.findFirst({
        where: { userId, provider: source }
      });

      if (existingAccount) {
        await prisma.linkedAccount.update({
          where: { id: existingAccount.id },
          data: { balance: finalBalance, lastSynced: new Date() }
        });
      } else {
        await prisma.linkedAccount.create({
          data: { userId, provider: source, type, name: accountName, balance: finalBalance, isActive: true }
        });
      }
    }
    console.log(`[BACKGROUND JOB] Saldo Akun Terhubung berhasil dihitung!`);

    // KALKULASI AGREGASI BULANAN
    const uniqueMonths = [...new Set(sanitizedTransactions.map(t => {
      const d = t.dateTime;
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    }))];

    let totalExpenseAllMonths = 0;
    for (const monthKey of uniqueMonths) {
      const [year, month] = monthKey.split('-');
      const agg = await calculateMonthlyAggregation(userId, Number(year), Number(month));
      if (agg) totalExpenseAllMonths += agg.totalExpense;
    }

    const avgMonthlyExpense = totalExpenseAllMonths / (uniqueMonths.length || 1);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthly_expenses: avgMonthlyExpense,
        current_savings: Math.max(0, (monthlyIncome || 0) - avgMonthlyExpense)
      }
    });

    console.log(`[BACKGROUND JOB] Sistem siap! Seluruh profil pengguna ${userId} telah ter-generate.\n`);

  } catch (error) {
    console.error(`[BACKGROUND JOB ERROR] Gagal memproses mock:`, error.message);
  }
};