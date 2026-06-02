export const createMockTransactions = (
  jobType = 'permanent',
  statedIncome = 5000000,
  linkedAccounts = [],
  mode = 'full'
) => {
  const generatedTransactions = []
  const endDate = new Date()
  const startDate = new Date()

  if (mode === 'full') {
    startDate.setMonth(endDate.getMonth() - 12)
  } else {
    startDate.setDate(endDate.getDate() - 1)
  }
  
  const userBanks = linkedAccounts
    .filter((acc) => acc.type === 'bank')
    .map((acc) => acc.provider.toLowerCase())
  const userEwallets = linkedAccounts
    .filter((acc) => acc.type === 'ewallet')
    .map((acc) => acc.provider.toLowerCase())

  // Fallback
  const fallbackBanks = ['bca', 'mandiri', 'bri', 'bni', 'cimb']
  const fallbackEwallets = ['gopay', 'ovo', 'dana', 'shopeepay']

  // Tentukan Bank Utama (Prioritaskan bank pertama yang dipilih user)
  const primaryBank =
    userBanks.length > 0
      ? userBanks[0]
      : fallbackBanks[Math.floor(Math.random() * fallbackBanks.length)]

  // Tentukan Bank Sekunder (Gunakan bank kedua jika user pilih > 1 bank. Jika tidak, ambil fallback selain bank utama)
  let secondaryBank =
    userBanks.length > 1 ? userBanks[1] : fallbackBanks.find((b) => b !== primaryBank)
  if (!secondaryBank) secondaryBank = 'mandiri' // Pengaman akhir

  // Tentukan E-Wallet Utama (Prioritaskan e-wallet pertama yang dipilih user)
  const primaryEwallet =
    userEwallets.length > 0
      ? userEwallets[0]
      : fallbackEwallets[Math.floor(Math.random() * fallbackEwallets.length)]


  let myFoodHabit = 0.3
  let isShopaholic = false

  // Penyesuaian Perilaku Berdasarkan Pekerjaan
  if (jobType === 'not_working' || jobType === 'student' || jobType === 'Mahasiswa') {
    myFoodHabit = 0.6 
    isShopaholic = false 
  } else if (jobType === 'freelance' || jobType === 'gig') {
    myFoodHabit = 0.5 
    isShopaholic = true
  } else {
    myFoodHabit = 0.4
    isShopaholic = Math.random() > 0.5
  }

  let currentMonth = new Date(startDate)

  while (currentMonth <= endDate) {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

 
    if (jobType === 'not_working' || jobType === 'student' || jobType === 'Mahasiswa') {
      generatedTransactions.push({
        dateTime: new Date(year, month, 3, 10, 0, 0).toISOString(),
        description: 'TRANSFER DARI ORANG TUA / BEASISWA',
        amount: statedIncome,
        categoryLabel: null,
        transactionType: 'credit',
        paymentMethod: 'tunai',
        source: primaryBank, 
      })
    } else if (jobType === 'freelance' || jobType === 'gig') {
      // FREELANCER
      const projectCount = Math.floor(Math.random() * 3) + 1
      const splitIncome = Math.floor(statedIncome / projectCount)

      for (let p = 0; p < projectCount; p++) {
        const randomDay = Math.floor(Math.random() * 25) + 1
        generatedTransactions.push({
          dateTime: new Date(year, month, randomDay, 14, 0, 0).toISOString(),
          description: `FEE PROJECT FREELANCE ${p + 1}`,
          amount: splitIncome,
          categoryLabel: null,
          transactionType: 'credit',
          paymentMethod: 'tunai',
          source: primaryBank, 
        })
      }
    } else {
      // KARYAWAN TETAP
      generatedTransactions.push({
        dateTime: new Date(year, month, 25, 9, 0, 0).toISOString(),
        description: 'PAYROLL GAJI BULANAN',
        amount: statedIncome,
        categoryLabel: null,
        transactionType: 'credit',
        paymentMethod: 'tunai',
        source: primaryBank, 
      })
    }

    const operationalFund = 2000000

  
    generatedTransactions.push({
      dateTime: new Date(year, month, 1, 8, 0, 0).toISOString(),
      description: `TRANSFER KE ${secondaryBank.toUpperCase()} (KEBUTUHAN BULANAN)`,
      amount: operationalFund,
      categoryLabel: 'transfer_internal',
      transactionType: 'debit',
      paymentMethod: 'debit',
      source: primaryBank,
    })

    // Uang Masuk ke Bank Sekunder
    generatedTransactions.push({
      dateTime: new Date(year, month, 1, 8, 1, 0).toISOString(),
      description: `TRANSFER DARI ${primaryBank.toUpperCase()}`,
      amount: operationalFund,
      categoryLabel: 'transfer_internal',
      transactionType: 'credit',
      paymentMethod: 'debit',
      source: secondaryBank,
    })

    // Pengeluaran Tetap (Kos & Listrik) via Bank Sekunder
    generatedTransactions.push({
      dateTime: new Date(year, month, 2, 9, 0, 0).toISOString(),
      description: 'TRANSFER IBU KOS',
      amount: 1500000,
      categoryLabel: null,
      transactionType: 'debit',
      paymentMethod: 'debit',
      source: secondaryBank,
    })

    generatedTransactions.push({
      dateTime: new Date(year, month, 5, 12, 30, 0).toISOString(),
      description: 'PYMNT PLN TOKEN',
      amount: Math.floor(Math.random() * 200000) + 300000,
      categoryLabel: null,
      transactionType: 'debit',
      paymentMethod: 'debit',
      source: secondaryBank,
    })

    for (let day = 1; day <= daysInMonth; day++) {
      const isWeekend = new Date(year, month, day).getDay() % 6 === 0

      // Jajan Makanan
      if (Math.random() < myFoodHabit) {
        const isStudent =
          jobType === 'not_working' || jobType === 'student' || jobType === 'Mahasiswa'
        const foodDesc = isStudent
          ? Math.random() > 0.5
            ? 'GOFOOD WARMINDO'
            : 'KOPI KENANGAN'
          : Math.random() > 0.5
            ? 'GOFOOD AYAM GEPREK'
            : 'STARBUCKS'
        const foodPrice = isStudent
          ? Math.floor(Math.random() * 20000) + 15000
          : Math.floor(Math.random() * 50000) + 35000

        generatedTransactions.push({
          dateTime: new Date(
            year,
            month,
            day,
            12 + Math.floor(Math.random() * 8),
            0,
            0
          ).toISOString(),
          description: foodDesc,
          amount: foodPrice,
          categoryLabel: null,
          transactionType: 'debit',
          paymentMethod: 'ewallet',
          source: primaryEwallet, // Dari e-wallet utama
        })
      }

      // Belanja Weekend
      if (isWeekend && isShopaholic && Math.random() > 0.4) {
        generatedTransactions.push({
          dateTime: new Date(year, month, day, 16, Math.floor(Math.random() * 60), 0).toISOString(),
          description: 'UNIQLO STORE INDONESIA',
          amount: Math.floor(Math.random() * 300000) + 150000,
          categoryLabel: null,
          transactionType: 'debit',
          paymentMethod: 'debit',
          source: primaryBank, // Belanja pakai bank utama
        })
      }

      // Top-up E-Wallet Dinamis tiap hari Senin
      if (new Date(year, month, day).getDay() === 1) {
        const topupAmount = (Math.floor(Math.random() * 6) + 5) * 50000 // 250rb - 500rb

        // Uang Keluar dari Bank Utama
        generatedTransactions.push({
          dateTime: new Date(year, month, day, 8, 0, 0).toISOString(),
          description: `TOPUP ${primaryEwallet.toUpperCase()} VIA M-APP`,
          amount: topupAmount,
          categoryLabel: 'topup_ewallet',
          transactionType: 'debit',
          paymentMethod: 'debit',
          source: primaryBank,
        })

        // Uang Masuk ke E-Wallet Utama
        generatedTransactions.push({
          dateTime: new Date(year, month, day, 8, 1, 0).toISOString(),
          description: `TOPUP DARI ${primaryBank.toUpperCase()}`,
          amount: topupAmount,
          categoryLabel: 'topup_ewallet',
          transactionType: 'credit',
          paymentMethod: 'ewallet',
          source: primaryEwallet,
        })
      }
    }
    currentMonth.setMonth(currentMonth.getMonth() + 1)
  }

  generatedTransactions.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
  return generatedTransactions.filter((t) => new Date(t.dateTime) <= endDate)
}
