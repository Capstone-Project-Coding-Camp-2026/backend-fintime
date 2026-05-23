/*
  Warnings:

  - You are about to drop the column `linkedAccounts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `User` table. All the data in the column will be lost.
  - The `monthlyIncome` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `avatarCondition` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('tunai', 'debit', 'paylater', 'ewallet', 'credit');

-- CreateEnum
CREATE TYPE "AvatarCondition" AS ENUM ('good', 'normal', 'bad');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('permanent', 'freelance', 'gig', 'civil_servant', 'entrepreneur', 'not_working');

-- CreateEnum
CREATE TYPE "AccountSource" AS ENUM ('bca', 'mandiri', 'bri', 'bni', 'btn', 'cimb', 'permata', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'lainnya');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "linkedAccounts",
DROP COLUMN "occupation",
ADD COLUMN     "jobType" "JobType",
ADD COLUMN     "labelRules" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "monthlyIncome",
ADD COLUMN     "monthlyIncome" DOUBLE PRECISION,
DROP COLUMN "avatarCondition",
ADD COLUMN     "avatarCondition" "AvatarCondition" NOT NULL DEFAULT 'normal';

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "categoryLabel" TEXT,
    "confidence" DOUBLE PRECISION,
    "transactionType" "TransactionType" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "source" "AccountSource",
    "isLabelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" "AccountSource" NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" TIMESTAMP(3),
    "apiToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aggregation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthYear" TEXT NOT NULL,
    "totalIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseHousing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseFoodDrink" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseTransportation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseEntertainment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseHealth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseEducation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseShopping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseBills" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseOther" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentTotalBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseToIncomeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aggregation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvatarState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "projectedWealth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pensionSurvivalYears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedAssetClass" TEXT,
    "predictedExpenseTrend" JSONB NOT NULL DEFAULT '[]',
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvatarState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learning" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetCondition" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_dateTime_idx" ON "Transaction"("dateTime");

-- CreateIndex
CREATE INDEX "Transaction_categoryLabel_idx" ON "Transaction"("categoryLabel");

-- CreateIndex
CREATE INDEX "Transaction_userId_dateTime_idx" ON "Transaction"("userId", "dateTime");

-- CreateIndex
CREATE INDEX "LinkedAccount_userId_provider_idx" ON "LinkedAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_userId_provider_accountNumber_key" ON "LinkedAccount"("userId", "provider", "accountNumber");

-- CreateIndex
CREATE INDEX "Aggregation_userId_idx" ON "Aggregation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Aggregation_userId_monthYear_key" ON "Aggregation"("userId", "monthYear");

-- CreateIndex
CREATE UNIQUE INDEX "AvatarState_userId_key" ON "AvatarState"("userId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedAccount" ADD CONSTRAINT "LinkedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aggregation" ADD CONSTRAINT "Aggregation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarState" ADD CONSTRAINT "AvatarState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
