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

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INVESTOR',
    "avatarUrl" TEXT,
    "profileData" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "websiteUrl" TEXT,
    "investmentRangeMin" DECIMAL(15,2),
    "investmentRangeMax" DECIMAL(15,2),
    "preferredIndustries" JSONB,
    "previousExits" JSONB,
    "accreditationStatus" "AccreditationStatus" NOT NULL DEFAULT 'PENDING',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "stage" "StartupStage" NOT NULL,
    "fundingGoal" DECIMAL(15,2) NOT NULL,
    "currentFunding" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "founderId" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "teamSize" INTEGER,
    "foundedDate" TIMESTAMP(3),
    "businessModel" TEXT,
    "targetMarket" TEXT,
    "competitiveAdvantage" TEXT,
    "financialData" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "startups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitches" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "problemStatement" TEXT,
    "solution" TEXT,
    "marketOpportunity" TEXT,
    "competitiveAnalysis" TEXT,
    "financialProjections" JSONB,
    "fundingAmount" DECIMAL(15,2) NOT NULL,
    "equityOffered" DECIMAL(5,2),
    "minimumInvestment" DECIMAL(15,2) NOT NULL,
    "status" "PitchStatus" NOT NULL DEFAULT 'DRAFT',
    "pitchDeckUrl" TEXT,
    "videoUrl" TEXT,
    "tags" JSONB,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "equityPercentage" DECIMAL(5,2),
    "sharePrice" DECIMAL(15,2),
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING',
    "investmentType" "InvestmentType" NOT NULL DEFAULT 'DIRECT',
    "syndicateLeadId" TEXT,
    "terms" JSONB,
    "legalDocuments" JSONB,
    "escrowReference" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "investmentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalInvested" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalExits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "investmentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentProvider" TEXT,
    "paymentReference" TEXT,
    "externalTransactionId" TEXT,
    "feeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "pitchId" TEXT,
    "investmentId" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'GENERAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "pitchId" TEXT,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "DocumentType" NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_isVerified_idx" ON "users"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_profiles_accreditationStatus_idx" ON "user_profiles"("accreditationStatus");

-- CreateIndex
CREATE INDEX "user_profiles_kycStatus_idx" ON "user_profiles"("kycStatus");

-- CreateIndex
CREATE UNIQUE INDEX "startups_slug_key" ON "startups"("slug");

-- CreateIndex
CREATE INDEX "startups_founderId_idx" ON "startups"("founderId");

-- CreateIndex
CREATE INDEX "startups_industry_idx" ON "startups"("industry");

-- CreateIndex
CREATE INDEX "startups_stage_idx" ON "startups"("stage");

-- CreateIndex
CREATE INDEX "startups_slug_idx" ON "startups"("slug");

-- CreateIndex
CREATE INDEX "startups_isVerified_idx" ON "startups"("isVerified");

-- CreateIndex
CREATE INDEX "startups_isActive_idx" ON "startups"("isActive");

-- CreateIndex
CREATE INDEX "startups_createdAt_idx" ON "startups"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pitches_slug_key" ON "pitches"("slug");

-- CreateIndex
CREATE INDEX "pitches_startupId_idx" ON "pitches"("startupId");

-- CreateIndex
CREATE INDEX "pitches_status_idx" ON "pitches"("status");

-- CreateIndex
CREATE INDEX "pitches_isFeatured_idx" ON "pitches"("isFeatured");

-- CreateIndex
CREATE INDEX "pitches_expiresAt_idx" ON "pitches"("expiresAt");

-- CreateIndex
CREATE INDEX "pitches_createdAt_idx" ON "pitches"("createdAt");

-- CreateIndex
CREATE INDEX "pitches_viewCount_idx" ON "pitches"("viewCount");

-- CreateIndex
CREATE INDEX "pitches_status_isFeatured_idx" ON "pitches"("status", "isFeatured");

-- CreateIndex
CREATE INDEX "pitches_status_createdAt_idx" ON "pitches"("status", "createdAt");

-- CreateIndex
CREATE INDEX "investments_investorId_idx" ON "investments"("investorId");

-- CreateIndex
CREATE INDEX "investments_pitchId_idx" ON "investments"("pitchId");

-- CreateIndex
CREATE INDEX "investments_status_idx" ON "investments"("status");

-- CreateIndex
CREATE INDEX "investments_investmentType_idx" ON "investments"("investmentType");

-- CreateIndex
CREATE INDEX "investments_investmentDate_idx" ON "investments"("investmentDate");

-- CreateIndex
CREATE INDEX "investments_createdAt_idx" ON "investments"("createdAt");

-- CreateIndex
CREATE INDEX "investments_status_createdAt_idx" ON "investments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "investments_investorId_status_idx" ON "investments"("investorId", "status");

-- CreateIndex
CREATE INDEX "portfolios_investorId_idx" ON "portfolios"("investorId");

-- CreateIndex
CREATE INDEX "portfolios_isPublic_idx" ON "portfolios"("isPublic");

-- CreateIndex
CREATE INDEX "portfolios_createdAt_idx" ON "portfolios"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_investmentId_idx" ON "transactions"("investmentId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_externalTransactionId_idx" ON "transactions"("externalTransactionId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_status_createdAt_idx" ON "transactions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_receiverId_idx" ON "messages"("receiverId");

-- CreateIndex
CREATE INDEX "messages_pitchId_idx" ON "messages"("pitchId");

-- CreateIndex
CREATE INDEX "messages_investmentId_idx" ON "messages"("investmentId");

-- CreateIndex
CREATE INDEX "messages_isRead_idx" ON "messages"("isRead");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_receiverId_idx" ON "messages"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "messages_isRead_createdAt_idx" ON "messages"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "comments_pitchId_idx" ON "comments"("pitchId");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_parentCommentId_idx" ON "comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "comments_isApproved_idx" ON "comments"("isApproved");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "comments_pitchId_createdAt_idx" ON "comments"("pitchId", "createdAt");

-- CreateIndex
CREATE INDEX "documents_startupId_idx" ON "documents"("startupId");

-- CreateIndex
CREATE INDEX "documents_pitchId_idx" ON "documents"("pitchId");

-- CreateIndex
CREATE INDEX "documents_fileType_idx" ON "documents"("fileType");

-- CreateIndex
CREATE INDEX "documents_isPublic_idx" ON "documents"("isPublic");

-- CreateIndex
CREATE INDEX "documents_uploadedBy_idx" ON "documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_isRead_createdAt_idx" ON "notifications"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_action_idx" ON "audit_logs"("createdAt", "action");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires");

-- CreateIndex
CREATE INDEX "sessions_sessionToken_idx" ON "sessions"("sessionToken");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startups" ADD CONSTRAINT "startups_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_syndicateLeadId_fkey" FOREIGN KEY ("syndicateLeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;