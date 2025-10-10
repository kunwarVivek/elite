-- CreateEnum
CREATE TYPE "SyndicateMessageType" AS ENUM ('GENERAL', 'INVESTMENT_UPDATE', 'LEGAL_UPDATE', 'DISTRIBUTION', 'MEETING');
-- CreateEnum
CREATE TYPE "SyndicateDocumentType" AS ENUM ('SYNDICATE_AGREEMENT', 'INVESTMENT_MEMORANDUM', 'LEGAL_DOCUMENT', 'FINANCIAL_STATEMENT', 'MEETING_MINUTES', 'OTHER');
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FOUNDER', 'INVESTOR', 'SYNDICATE_LEAD', 'ADMIN');
-- CreateEnum
CREATE TYPE "AccreditationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
-- CreateEnum
CREATE TYPE "StartupStage" AS ENUM ('IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALE');
-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'FUNDED', 'CLOSED', 'WITHDRAWN');
-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'ESCROW', 'DUE_DILIGENCE', 'LEGAL_REVIEW', 'COMPLETED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('DIRECT', 'SYNDICATE');
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'INVESTMENT', 'REFUND');
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('GENERAL', 'PITCH_INQUIRY', 'INVESTMENT_DISCUSSION', 'SUPPORT');
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PITCH_DECK', 'BUSINESS_PLAN', 'FINANCIAL_STATEMENT', 'LEGAL_DOCUMENT', 'OTHER');
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVESTMENT_UPDATE', 'MESSAGE', 'PITCH_UPDATE', 'SYSTEM', 'PAYMENT');
-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
-- CreateEnum
CREATE TYPE "SyndicateStatus" AS ENUM ('FORMING', 'ACTIVE', 'FULLY_FUNDED', 'CLOSING', 'CLOSED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "SyndicateInvestmentStatus" AS ENUM ('COMMITTED', 'FUNDED', 'DISTRIBUTED', 'EXITED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "SPVStatus" AS ENUM ('FORMING', 'ACTIVE', 'DISSOLVING', 'DISSOLVED');
-- CreateEnum
CREATE TYPE "SPVInvestmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'EXITED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('BUY', 'SELL');
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACTIVE', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'EXPIRED');
-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'EXECUTED', 'SETTLED', 'FAILED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "AccreditationMethod" AS ENUM ('NET_WORTH', 'INCOME', 'PROFESSIONAL', 'EXISTING_RELATIONSHIP', 'THIRD_PARTY_VERIFICATION');
-- CreateEnum
CREATE TYPE "AmlStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'REQUIRES_REVIEW', 'EXEMPT');
-- CreateEnum
CREATE TYPE "PepStatus" AS ENUM ('NOT_PEP', 'PEP', 'FAMILY_MEMBER', 'CLOSE_ASSOCIATE');
-- CreateEnum
CREATE TYPE "SanctionStatus" AS ENUM ('CLEAR', 'PARTIAL_MATCH', 'FULL_MATCH', 'UNDER_REVIEW');
-- CreateEnum
CREATE TYPE "ComplianceLogStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REQUIRES_REVIEW');
-- CreateEnum
CREATE TYPE "ComplianceDocumentType" AS ENUM ('PASSPORT', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT', 'TAX_RETURN', 'ACCREDITATION_CERTIFICATE', 'SOURCE_OF_FUNDS', 'OTHER');
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');
-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('SELF_ATTESTATION', 'THIRD_PARTY_VERIFICATION', 'DOCUMENTARY_EVIDENCE', 'EXISTING_RELATIONSHIP');
-- CreateEnum
CREATE TYPE "PerformanceMetricType" AS ENUM ('INVESTMENT_RETURN', 'PORTFOLIO_VALUE', 'USER_ACTIVITY', 'PLATFORM_METRIC', 'STARTUP_METRIC', 'SYNDICATE_METRIC', 'SPV_METRIC', 'COMPLIANCE_METRIC');
-- CreateEnum
CREATE TYPE "AnalyticsSnapshotType" AS ENUM ('DAILY_SUMMARY', 'WEEKLY_SUMMARY', 'MONTHLY_SUMMARY', 'USER_ANALYTICS', 'STARTUP_ANALYTICS', 'INVESTMENT_ANALYTICS', 'SYNDICATE_ANALYTICS', 'SPV_ANALYTICS', 'COMPLIANCE_ANALYTICS', 'PLATFORM_OVERVIEW');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_metrics" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "waiting" INTEGER NOT NULL,
    "active" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "delayed" INTEGER NOT NULL,
    "paused" INTEGER NOT NULL,
    "averageProcessingTime" DOUBLE PRECISION NOT NULL,
    "throughputPerSecond" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "uptime" DOUBLE PRECISION NOT NULL,
    "memoryUsed" DOUBLE PRECISION NOT NULL,
    "memoryTotal" DOUBLE PRECISION NOT NULL,
    "memoryPercentage" DOUBLE PRECISION NOT NULL,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "activeQueues" INTEGER NOT NULL,
    "totalQueues" INTEGER NOT NULL,
    "activeWorkers" INTEGER NOT NULL,
    "totalWorkers" INTEGER NOT NULL,
    "dbConnections" INTEGER NOT NULL,
    "dbQueriesPerSecond" DOUBLE PRECISION NOT NULL,
    "wsConnections" INTEGER NOT NULL,
    "wsRooms" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TradeToTransaction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TradeToTransaction" ADD CONSTRAINT "_TradeToTransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TradeToTransaction" ADD CONSTRAINT "_TradeToTransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "verifications_token_key" ON "verifications"("token");
CREATE INDEX "verifications_token_idx" ON "verifications"("token");
CREATE INDEX "verifications_expires_idx" ON "verifications"("expires");
CREATE UNIQUE INDEX "verifications_identifier_token_key" ON "verifications"("identifier", "token");
CREATE INDEX "queue_metrics_queueName_idx" ON "queue_metrics"("queueName");
CREATE INDEX "queue_metrics_recordedAt_idx" ON "queue_metrics"("recordedAt");
CREATE INDEX "queue_metrics_queueName_recordedAt_idx" ON "queue_metrics"("queueName", "recordedAt");
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics"("timestamp");
CREATE INDEX "system_metrics_createdAt_idx" ON "system_metrics"("createdAt");
CREATE INDEX "alerts_type_idx" ON "alerts"("type");
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");
CREATE INDEX "alerts_isResolved_idx" ON "alerts"("isResolved");
CREATE INDEX "alerts_triggeredAt_idx" ON "alerts"("triggeredAt");
CREATE INDEX "alerts_type_severity_idx" ON "alerts"("type", "severity");
CREATE INDEX "alerts_isResolved_triggeredAt_idx" ON "alerts"("isResolved", "triggeredAt");
CREATE UNIQUE INDEX "_TradeToTransaction_AB_unique" ON "_TradeToTransaction"("A", "B");
CREATE INDEX "_TradeToTransaction_B_index" ON "_TradeToTransaction"("B");
