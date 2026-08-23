/*
  Warnings:

  - You are about to drop the column `isOpen` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `RiskScore` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `riskScore` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[transactionId]` on the table `RiskScore` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `severity` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadata` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reasons` to the `RiskScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riskLevel` to the `RiskScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ruleScore` to the `RiskScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionType` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vendor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "RiskScore" DROP CONSTRAINT "RiskScore_transactionId_fkey";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "isOpen",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "severity" "RiskLevel" NOT NULL,
ADD COLUMN     "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entity" TEXT NOT NULL,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "RiskScore" DROP COLUMN "level",
ADD COLUMN     "anomalyScore" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fraudProbability" DECIMAL(5,4),
ADD COLUMN     "modelVersion" TEXT,
ADD COLUMN     "reasons" JSONB NOT NULL,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL,
ADD COLUMN     "ruleScore" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "date",
DROP COLUMN "riskScore",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "transactionType" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RiskScore_transactionId_key" ON "RiskScore"("transactionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_vendorId_idx" ON "Transaction"("vendorId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
