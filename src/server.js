import 'dotenv/config'
import { startDailyCron } from './jobs/dailyCron.js'
import { createApp } from './app.js'

startDailyCron()
const PORT = Number(process.env.PORT) || 5000

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Set it in .env for production.')

  process.env.JWT_SECRET = 'dev-insecure-secret-change-me'
}

async function main() {
  const app = createApp()
  app.listen(PORT, () => {
    console.log(`FinTime API listening on http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
