import prisma from '../lib/prisma.js'
import { createMockTransactions } from '../config/utils/mockGenerator.js'
import { classifyTransactionAI } from './aiApiService.js'
import { calculateMonthlyAggregation } from './aggregationService.js'
import { generateForecast } from './forecastService.js'

export async function runDailySync() {
  console.log('Running daily sync...')

  const users = await prisma.user.findMany({
    include: {
      linkedAccounts: true,
    },
  })

  for (const user of users) {
    try {
      // generate mock transactions
      const generated = createMockTransactions(
        user.jobType,
        user.monthlyIncome,
        user.linkedAccounts,
        'daily'
      )

      // ambil transaksi hari ini aja
      const today = new Date()

      const todayTransactions = generated.filter((tx) => {
        const txDate = new Date(tx.dateTime)

        return (
          txDate.getDate() === today.getDate() &&
          txDate.getMonth() === today.getMonth() &&
          txDate.getFullYear() === today.getFullYear()
        )
      })

      for (const tx of todayTransactions) {
        // cek duplicate
        const exists = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            description: tx.description,
            amount: tx.amount,
          },
        })
        if (exists) continue

        // classify AI
        let categoryLabel = 'lainnya'
        let confidence = 0

        try {
          const aiResult = await classifyTransactionAI(tx.description)

          categoryLabel = aiResult.category_label || aiResult.category || 'lainnya'

          confidence = aiResult.confidence || 0
          
          if (confidence < 0.7) {
            categoryLabel = 'lainnya'
          }
        } catch (e) {
          console.error('AI classify failed:', e.message)
        }

        // save transaction
        await prisma.transaction.create({
          data: {
            userId: user.id,
            dateTime: new Date(tx.dateTime),
            description: tx.description,
            amount: tx.amount,
            categoryLabel,
            confidence,
            transactionType: tx.transactionType,
            paymentMethod: tx.paymentMethod,
            source: tx.source,
            isLabelled: confidence >= 0.7,
          },
        })
      }

      // aggregation bulan sekarang
      const now = new Date()

      await calculateMonthlyAggregation(user.id, now.getFullYear(), now.getMonth() + 1)

      // regenerate forecast
      await generateForecast(user.id)

      console.log(`Daily sync success: ${user.email}`)
    } catch (err) {
      console.error(`Daily sync failed for ${user.email}`, err)
    }
  }
}
