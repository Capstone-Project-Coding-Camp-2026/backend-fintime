import { Router } from 'express'
import * as financeController from '../controllers/financeController.js'

const router = Router()

// Budget Routes
router.get('/budgets/:userId', financeController.getBudgets)
router.post('/budgets/:userId', financeController.createBudget)
router.put('/budgets/:budgetId', financeController.updateBudget)
router.delete('/budgets/:budgetId', financeController.deleteBudget)

// Debt Routes
router.get('/debts/:userId', financeController.getDebts)
router.post('/debts/:userId', financeController.createDebt)
router.put('/debts/:debtId', financeController.updateDebt)
router.delete('/debts/:debtId', financeController.deleteDebt)
router.post('/debts/:debtId/payments', financeController.recordDebtPayment)

// Goal Routes
router.get('/goals/:userId', financeController.getGoals)
router.post('/goals/:userId', financeController.createGoal)
router.put('/goals/:goalId', financeController.updateGoal)
router.delete('/goals/:goalId', financeController.deleteGoal)
router.post('/goals/:goalId/savings', financeController.addGoalSavings)

// Investment Routes
router.get('/investments/:userId', financeController.getInvestments)
router.post('/investments/:userId', financeController.createInvestment)
router.put('/investments/:investmentId', financeController.updateInvestment)
router.delete('/investments/:investmentId', financeController.deleteInvestment)

// Recurring Routes
router.get('/recurring/:userId', financeController.getRecurring)
router.post('/recurring/:userId', financeController.createRecurring)
router.put('/recurring/:recurringId', financeController.updateRecurring)
router.delete('/recurring/:recurringId', financeController.deleteRecurring)

export default router