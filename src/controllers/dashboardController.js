
import prisma from '../lib/prisma.js'

export async function getDashboard(req, res, next) {
  try {
    const { userId } = req.params

    if (req.user.sub !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }


    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentMonthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

    const [user, avatarState, currentAgg, linkedAccounts, unlabelledCount, recentTransactions, last6Months] =
      await Promise.all([
        // 1. User profile
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            fullName: true,
            email: true,
            gender: true,
            birthDate: true,
            jobType: true,
            monthlyIncome: true,
            monthlyExpenses: true,
            currentSavings: true,
            retirementAge: true,
            avatarCondition: true,
            labelRules: true,
            createdAt: true,
          },
        }),

        // 2. Avatar state (forecast + kondisi)
        prisma.avatarState.findUnique({
          where: { userId },
        }),

        // 3. Aggregasi bulan ini
        prisma.aggregation.findFirst({
          where: { userId, monthYear: currentMonthYear },
        }),

        // 4. Rekening tertaut
        prisma.linkedAccount.findMany({
          where: { userId, isActive: true },
          orderBy: { type: 'asc' },
        }),

        // 5. Jumlah transaksi belum terlabel (perlu re-label)
        prisma.transaction.count({
          where: {
            userId,
            OR: [
              { categoryLabel: null },
              { categoryLabel: 'lainnya' },
              { isLabelled: false },
            ],
          },
        }),

        // 6. 5 transaksi terbaru
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { dateTime: 'desc' },
          take: 5,
        }),

        // 7. Aggregasi 6 bulan terakhir untuk trend chart
        prisma.aggregation.findMany({
          where: {
            userId,
            monthYear: {
              gte: (() => {
                const d = new Date(currentYear, currentMonth - 7, 1)
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              })(),
            },
          },
          orderBy: { monthYear: 'asc' },
          take: 6,
        }),
      ])

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Hitung umur dari birthDate
    let currentAge = null
    if (user.birthDate) {
      currentAge = currentYear - new Date(user.birthDate).getFullYear()
    }

    // Ringkasan rekening
    const totalBalance = linkedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    const bankAccounts = linkedAccounts.filter((a) => a.type === 'bank')
    const ewalletAccounts = linkedAccounts.filter((a) => a.type === 'ewallet')

    // Kalkulasi rumus BAB 10 secara real-time dari data bulan ini
    const monthlyIncome = currentAgg?.totalIncome || user.monthlyIncome || 0
    const monthlyExpense = currentAgg?.totalExpense || user.monthlyExpenses || 0
    const savingsCapacity = currentAgg?.savingsCapacity ?? (monthlyIncome - monthlyExpense)
    const expenseToIncomeRatio = currentAgg?.expenseToIncomeRatio ??
      (monthlyIncome > 0 ? monthlyExpense / monthlyIncome : 0)
    const savingsRate = currentAgg?.savingsRate ??
      (monthlyIncome > 0 ? savingsCapacity / monthlyIncome : 0)

    // Trend 6 bulan: income, expense, savings
    const expenseTrend = last6Months.map((agg) => ({
      monthYear: agg.monthYear,
      totalIncome: agg.totalIncome,
      totalExpense: agg.totalExpense,
      savingsCapacity: agg.savingsCapacity,
      expenseToIncomeRatio: agg.expenseToIncomeRatio,
      // Breakdown per kategori
      breakdown: {
        makanan: agg.expenseFoodDrink,
        transport: agg.expenseTransportation,
        hiburan: agg.expenseEntertainment,
        belanja: agg.expenseShopping,
        tagihan: agg.expenseBills,
        kesehatan: agg.expenseHealth,
        pendidikan: agg.expenseEducation,
        perumahan: agg.expenseHousing,
        lainnya: agg.expenseOther,
      },
    }))

    // Remove password dari response
    const { password: _, labelRules: __, ...safeUser } = user

    res.json({
      success: true,
      data: {
        // === USER ===
        user: {
          ...safeUser,
          currentAge,
          occupation: user.jobType,
        },

        // === AVATAR (kondisi keuangan) ===
        avatar: avatarState
          ? {
              condition: avatarState.condition,         // good / normal / bad
              projectedWealth: avatarState.projectedWealth,
              pensionSurvivalYears: avatarState.pensionSurvivalYears,
              recommendedAssetClass: avatarState.recommendedAssetClass,
              predictedExpenseTrend: avatarState.predictedExpenseTrend, // array 12 bulan
              lastCalculated: avatarState.lastCalculated,
            }
          : null,

        // === BULAN INI (kalkulasi sesuai README BAB 10.1) ===
        currentMonth: {
          monthYear: currentMonthYear,
          totalIncome: monthlyIncome,
          totalExpense: monthlyExpense,
          savingsCapacity,
          expenseToIncomeRatio: parseFloat(expenseToIncomeRatio.toFixed(4)),
          savingsRate: parseFloat(savingsRate.toFixed(4)),
          transactionCount: currentAgg?.transactionCount || 0,
          breakdown: currentAgg
            ? {
                makanan: currentAgg.expenseFoodDrink,
                transport: currentAgg.expenseTransportation,
                hiburan: currentAgg.expenseEntertainment,
                belanja: currentAgg.expenseShopping,
                tagihan: currentAgg.expenseBills,
                kesehatan: currentAgg.expenseHealth,
                pendidikan: currentAgg.expenseEducation,
                perumahan: currentAgg.expenseHousing,
                lainnya: currentAgg.expenseOther,
              }
            : null,
        },

        // === REKENING TERTAUT ===
        accounts: {
          totalBalance,
          banks: bankAccounts,
          ewallets: ewalletAccounts,
          count: linkedAccounts.length,
        },

        // === NOTIFIKASI ===
        notifications: {
          unlabelledTransactions: unlabelledCount,
          hasUnlabelled: unlabelledCount > 0,
          message: unlabelledCount > 0
            ? `Ada ${unlabelledCount} transaksi yang perlu dikategorisasi`
            : null,
        },

        // === TRANSAKSI TERBARU ===
        recentTransactions,

        // === TREND 6 BULAN ===
        expenseTrend,
      },
    })
  } catch (e) {
    next(e)
  }
}
