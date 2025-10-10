-- Migration: Add Missing Database Entities for Angel Investing Marketplace
-- This migration adds critical missing entities and compliance infrastructure

-- ============================================================================
-- NEW ENTITIES FOR CORE BUSINESS FUNCTIONALITY
-- ============================================================================

-- Syndicate Management
CREATE TABLE "syndicates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "lead_investor_id" TEXT NOT NULL,
    "target_amount" DECIMAL(15,2) NOT NULL,
    "minimum_investment" DECIMAL(15,2) NOT NULL,
    "max_investors" INTEGER,
    "current_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "investor_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'FORMING',
    "investment_terms" JSONB,
    "legal_structure" TEXT,
    "formation_date" TIMESTAMP(3),
    "closing_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syndicates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "syndicate_investments" (
    "id" TEXT NOT NULL,
    "syndicate_id" TEXT NOT NULL,
    "investor_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "commitment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syndicate_investments_pkey" PRIMARY KEY ("id")
);

-- SPV Management
CREATE TABLE "spvs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "syndicate_id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "formation_date" TIMESTAMP(3),
    "registration_number" TEXT,
    "tax_id" TEXT,
    "bank_account" JSONB,
    "status" TEXT NOT NULL DEFAULT 'FORMING',
    "total_capital" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "management_fee" DECIMAL(5,2),
    "carried_interest" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spvs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "spv_investments" (
    "id" TEXT NOT NULL,
    "spv_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "ownership_percentage" DECIMAL(5,2) NOT NULL,
    "capital_commitment" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spv_investments_pkey" PRIMARY KEY ("id")
);

-- Secondary Marketplace
CREATE TABLE "share_certificates" (
    "id" TEXT NOT NULL,
    "spv_id" TEXT NOT NULL,
    "original_investor_id" TEXT NOT NULL,
    "current_owner_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "total_shares" INTEGER NOT NULL,
    "share_price" DECIMAL(15,2) NOT NULL,
    "total_value" DECIMAL(15,2) NOT NULL,
    "issued_date" TIMESTAMP(3) NOT NULL,
    "transfer_history" JSONB,
    "is_transferable" BOOLEAN NOT NULL DEFAULT true,
    "restrictions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_certificates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "share_certificate_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_share" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_share" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "fees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executed_at" TIMESTAMP(3),
    "settlement_date" TIMESTAMP(3),
    "transfer_documents" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- Syndicate Communication
CREATE TABLE "syndicate_messages" (
    "id" TEXT NOT NULL,
    "syndicate_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'GENERAL',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syndicate_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "syndicate_documents" (
    "id" TEXT NOT NULL,
    "syndicate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syndicate_documents_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- COMPLIANCE INFRASTRUCTURE
-- ============================================================================

-- Comprehensive Compliance Profiles
CREATE TABLE "compliance_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accredited_investor_status" TEXT NOT NULL DEFAULT 'PENDING',
    "accredited_investor_verified_at" TIMESTAMP(3),
    "accreditation_documents" JSONB,
    "net_worth" DECIMAL(15,2),
    "annual_income" DECIMAL(15,2),
    "accreditation_method" TEXT,
    "accreditation_expiry" TIMESTAMP(3),
    "kyc_status" TEXT NOT NULL DEFAULT 'PENDING',
    "kyc_verified_at" TIMESTAMP(3),
    "kyc_documents" JSONB,
    "aml_status" TEXT NOT NULL DEFAULT 'PENDING',
    "aml_verified_at" TIMESTAMP(3),
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "pep_status" TEXT NOT NULL DEFAULT 'NOT_PEP',
    "sanction_status" TEXT NOT NULL DEFAULT 'CLEAR',
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_consent_date" TIMESTAMP(3),
    "gdpr_consent_version" TEXT,
    "data_processing_consent" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "data_retention_expiry" TIMESTAMP(3),
    "compliance_notes" TEXT,
    "last_compliance_review" TIMESTAMP(3),
    "next_compliance_review" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_profiles_pkey" PRIMARY KEY ("id")
);

-- Compliance Audit Logs
CREATE TABLE "compliance_logs" (
    "id" TEXT NOT NULL,
    "compliance_profile_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "performed_by" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_logs_pkey" PRIMARY KEY ("id")
);

-- Compliance Documents
CREATE TABLE "compliance_documents" (
    "id" TEXT NOT NULL,
    "compliance_profile_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT,
    "document_status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "expiry_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- SEC Regulation D Compliance
CREATE TABLE "sec_regulation_d" (
    "id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "is_accredited_investor" BOOLEAN NOT NULL,
    "verification_method" TEXT NOT NULL,
    "issuer_verification" BOOLEAN NOT NULL DEFAULT false,
    "investor_attestation" BOOLEAN NOT NULL DEFAULT false,
    "investment_amount" DECIMAL(15,2) NOT NULL,
    "net_worth" DECIMAL(15,2),
    "annual_income" DECIMAL(15,2),
    "investment_percentage" DECIMAL(5,2),
    "disclosure_document" TEXT,
    "subscription_agreement" TEXT,
    "accredited_investor_certificate" TEXT,
    "compliance_notes" TEXT,
    "filed_with_sec" BOOLEAN NOT NULL DEFAULT false,
    "filing_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sec_regulation_d_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- PERFORMANCE TRACKING AND ANALYTICS
-- ============================================================================

-- Performance Metrics
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DECIMAL(15,2) NOT NULL,
    "metric_unit" TEXT,
    "period" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- Analytics Snapshots
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "data" JSONB NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE UNIQUE INDEX "syndicates_slug_key" ON "syndicates"("slug");
CREATE INDEX "syndicates_lead_investor_id_idx" ON "syndicates"("lead_investor_id");
CREATE INDEX "syndicates_status_idx" ON "syndicates"("status");
CREATE INDEX "syndicates_is_active_idx" ON "syndicates"("is_active");
CREATE INDEX "syndicates_created_at_idx" ON "syndicates"("created_at");
CREATE INDEX "syndicates_closing_date_idx" ON "syndicates"("closing_date");
CREATE INDEX "syndicates_status_is_active_idx" ON "syndicates"("status", "is_active");

CREATE INDEX "syndicate_investments_syndicate_id_idx" ON "syndicate_investments"("syndicate_id");
CREATE INDEX "syndicate_investments_investor_id_idx" ON "syndicate_investments"("investor_id");
CREATE INDEX "syndicate_investments_status_idx" ON "syndicate_investments"("status");
CREATE INDEX "syndicate_investments_commitment_date_idx" ON "syndicate_investments"("commitment_date");

CREATE INDEX "spvs_syndicate_id_idx" ON "spvs"("syndicate_id");
CREATE INDEX "spvs_status_idx" ON "spvs"("status");
CREATE INDEX "spvs_formation_date_idx" ON "spvs"("formation_date");
CREATE INDEX "spvs_registration_number_idx" ON "spvs"("registration_number");

CREATE INDEX "spv_investments_spv_id_idx" ON "spv_investments"("spv_id");
CREATE INDEX "spv_investments_investment_id_idx" ON "spv_investments"("investment_id");
CREATE INDEX "spv_investments_status_idx" ON "spv_investments"("status");

CREATE UNIQUE INDEX "share_certificates_certificate_number_key" ON "share_certificates"("certificate_number");
CREATE INDEX "share_certificates_spv_id_idx" ON "share_certificates"("spv_id");
CREATE INDEX "share_certificates_original_investor_id_idx" ON "share_certificates"("original_investor_id");
CREATE INDEX "share_certificates_current_owner_id_idx" ON "share_certificates"("current_owner_id");
CREATE INDEX "share_certificates_investment_id_idx" ON "share_certificates"("investment_id");
CREATE INDEX "share_certificates_is_transferable_idx" ON "share_certificates"("is_transferable");
CREATE INDEX "share_certificates_issued_date_idx" ON "share_certificates"("issued_date");

CREATE INDEX "orders_share_certificate_id_idx" ON "orders"("share_certificate_id");
CREATE INDEX "orders_seller_id_idx" ON "orders"("seller_id");
CREATE INDEX "orders_order_type_idx" ON "orders"("order_type");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_expires_at_idx" ON "orders"("expires_at");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "orders_status_order_type_idx" ON "orders"("status", "order_type");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

CREATE INDEX "trades_order_id_idx" ON "trades"("order_id");
CREATE INDEX "trades_buyer_id_idx" ON "trades"("buyer_id");
CREATE INDEX "trades_status_idx" ON "trades"("status");
CREATE INDEX "trades_executed_at_idx" ON "trades"("executed_at");
CREATE INDEX "trades_settlement_date_idx" ON "trades"("settlement_date");
CREATE INDEX "trades_created_at_idx" ON "trades"("created_at");
CREATE INDEX "trades_status_created_at_idx" ON "trades"("status", "created_at");

CREATE INDEX "syndicate_messages_syndicate_id_idx" ON "syndicate_messages"("syndicate_id");
CREATE INDEX "syndicate_messages_sender_id_idx" ON "syndicate_messages"("sender_id");
CREATE INDEX "syndicate_messages_is_read_idx" ON "syndicate_messages"("is_read");
CREATE INDEX "syndicate_messages_created_at_idx" ON "syndicate_messages"("created_at");
CREATE INDEX "syndicate_messages_syndicate_id_created_at_idx" ON "syndicate_messages"("syndicate_id", "created_at");

CREATE INDEX "syndicate_documents_syndicate_id_idx" ON "syndicate_documents"("syndicate_id");
CREATE INDEX "syndicate_documents_file_type_idx" ON "syndicate_documents"("file_type");
CREATE INDEX "syndicate_documents_is_public_idx" ON "syndicate_documents"("is_public");
CREATE INDEX "syndicate_documents_uploaded_by_idx" ON "syndicate_documents"("uploaded_by");
CREATE INDEX "syndicate_documents_created_at_idx" ON "syndicate_documents"("created_at");

CREATE UNIQUE INDEX "compliance_profiles_user_id_key" ON "compliance_profiles"("user_id");
CREATE INDEX "compliance_profiles_accredited_investor_status_idx" ON "compliance_profiles"("accredited_investor_status");
CREATE INDEX "compliance_profiles_kyc_status_idx" ON "compliance_profiles"("kyc_status");
CREATE INDEX "compliance_profiles_aml_status_idx" ON "compliance_profiles"("aml_status");
CREATE INDEX "compliance_profiles_pep_status_idx" ON "compliance_profiles"("pep_status");
CREATE INDEX "compliance_profiles_sanction_status_idx" ON "compliance_profiles"("sanction_status");
CREATE INDEX "compliance_profiles_accreditation_expiry_idx" ON "compliance_profiles"("accreditation_expiry");
CREATE INDEX "compliance_profiles_data_retention_expiry_idx" ON "compliance_profiles"("data_retention_expiry");

CREATE INDEX "compliance_logs_compliance_profile_id_idx" ON "compliance_logs"("compliance_profile_id");
CREATE INDEX "compliance_logs_status_idx" ON "compliance_logs"("status");
CREATE INDEX "compliance_logs_created_at_idx" ON "compliance_logs"("created_at");
CREATE INDEX "compliance_logs_action_idx" ON "compliance_logs"("action");

CREATE INDEX "compliance_documents_compliance_profile_id_idx" ON "compliance_documents"("compliance_profile_id");
CREATE INDEX "compliance_documents_document_type_idx" ON "compliance_documents"("document_type");
CREATE INDEX "compliance_documents_document_status_idx" ON "compliance_documents"("document_status");
CREATE INDEX "compliance_documents_expiry_date_idx" ON "compliance_documents"("expiry_date");
CREATE INDEX "compliance_documents_created_at_idx" ON "compliance_documents"("created_at");

CREATE UNIQUE INDEX "sec_regulation_d_investment_id_key" ON "sec_regulation_d"("investment_id");
CREATE INDEX "sec_regulation_d_is_accredited_investor_idx" ON "sec_regulation_d"("is_accredited_investor");
CREATE INDEX "sec_regulation_d_verification_method_idx" ON "sec_regulation_d"("verification_method");
CREATE INDEX "sec_regulation_d_filed_with_sec_idx" ON "sec_regulation_d"("filed_with_sec");
CREATE INDEX "sec_regulation_d_filing_date_idx" ON "sec_regulation_d"("filing_date");
CREATE INDEX "sec_regulation_d_created_at_idx" ON "sec_regulation_d"("created_at");

CREATE INDEX "performance_metrics_entity_type_idx" ON "performance_metrics"("entity_type");
CREATE INDEX "performance_metrics_entity_id_idx" ON "performance_metrics"("entity_id");
CREATE INDEX "performance_metrics_metric_type_idx" ON "performance_metrics"("metric_type");
CREATE INDEX "performance_metrics_period_idx" ON "performance_metrics"("period");
CREATE INDEX "performance_metrics_period_start_idx" ON "performance_metrics"("period_start");
CREATE INDEX "performance_metrics_period_end_idx" ON "performance_metrics"("period_end");
CREATE INDEX "performance_metrics_created_at_idx" ON "performance_metrics"("created_at");
CREATE INDEX "performance_metrics_entity_type_entity_id_metric_type_idx" ON "performance_metrics"("entity_type", "entity_id", "metric_type");
CREATE INDEX "performance_metrics_period_period_start_idx" ON "performance_metrics"("period", "period_start");

CREATE INDEX "analytics_snapshots_snapshot_type_idx" ON "analytics_snapshots"("snapshot_type");
CREATE INDEX "analytics_snapshots_entity_type_idx" ON "analytics_snapshots"("entity_type");
CREATE INDEX "analytics_snapshots_entity_id_idx" ON "analytics_snapshots"("entity_id");
CREATE INDEX "analytics_snapshots_snapshot_date_idx" ON "analytics_snapshots"("snapshot_date");
CREATE INDEX "analytics_snapshots_created_at_idx" ON "analytics_snapshots"("created_at");
CREATE INDEX "analytics_snapshots_snapshot_type_snapshot_date_idx" ON "analytics_snapshots"("snapshot_type", "snapshot_date");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE "syndicates" ADD CONSTRAINT "syndicates_lead_investor_id_fkey" FOREIGN KEY ("lead_investor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "syndicate_investments" ADD CONSTRAINT "syndicate_investments_syndicate_id_fkey" FOREIGN KEY ("syndicate_id") REFERENCES "syndicates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "syndicate_investments" ADD CONSTRAINT "syndicate_investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spvs" ADD CONSTRAINT "spvs_syndicate_id_fkey" FOREIGN KEY ("syndicate_id") REFERENCES "syndicates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "spv_investments" ADD CONSTRAINT "spv_investments_spv_id_fkey" FOREIGN KEY ("spv_id") REFERENCES "spvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "spv_investments" ADD CONSTRAINT "spv_investments_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "share_certificates" ADD CONSTRAINT "share_certificates_spv_id_fkey" FOREIGN KEY ("spv_id") REFERENCES "spvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "share_certificates" ADD CONSTRAINT "share_certificates_original_investor_id_fkey" FOREIGN KEY ("original_investor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "share_certificates" ADD CONSTRAINT "share_certificates_current_owner_id_fkey" FOREIGN KEY ("current_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "share_certificates" ADD CONSTRAINT "share_certificates_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_share_certificate_id_fkey" FOREIGN KEY ("share_certificate_id") REFERENCES "share_certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "syndicate_messages" ADD CONSTRAINT "syndicate_messages_syndicate_id_fkey" FOREIGN KEY ("syndicate_id") REFERENCES "syndicates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "syndicate_messages" ADD CONSTRAINT "syndicate_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "syndicate_documents" ADD CONSTRAINT "syndicate_documents_syndicate_id_fkey" FOREIGN KEY ("syndicate_id") REFERENCES "syndicates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "syndicate_documents" ADD CONSTRAINT "syndicate_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_profiles" ADD CONSTRAINT "compliance_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_logs" ADD CONSTRAINT "compliance_logs_compliance_profile_id_fkey" FOREIGN KEY ("compliance_profile_id") REFERENCES "compliance_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_compliance_profile_id_fkey" FOREIGN KEY ("compliance_profile_id") REFERENCES "compliance_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sec_regulation_d" ADD CONSTRAINT "sec_regulation_d_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- ADD NEW RELATION FIELDS TO EXISTING TABLES
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "compliance_profile_id" TEXT;
ALTER TABLE "investments" ADD COLUMN "sec_regulation_d_id" TEXT;
ALTER TABLE "transactions" ADD COLUMN "trade_id" TEXT;

-- Add foreign key constraints for new relations
ALTER TABLE "users" ADD CONSTRAINT "users_compliance_profile_id_fkey" FOREIGN KEY ("compliance_profile_id") REFERENCES "compliance_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investments" ADD CONSTRAINT "investments_sec_regulation_d_id_fkey" FOREIGN KEY ("sec_regulation_d_id") REFERENCES "sec_regulation_d"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- DATA MIGRATION STRATEGY COMMENTS
-- ============================================================================

/*
MIGRATION STRATEGY:

1. ENTITY CREATION:
   - All new tables are created with proper indexes and constraints
   - Foreign key relationships are established

2. EXISTING DATA MIGRATION:
   - Existing investments will need SEC Regulation D records created
   - Users will need compliance profiles initialized
   - Syndicate leads from existing investments should be migrated to syndicates

3. DATA TRANSFORMATION:
   - Convert existing investment syndicate leads to syndicate entities
   - Create share certificates for existing investments
   - Initialize compliance profiles for all users

4. BACKFILL STRATEGY:
   - Create default compliance profiles for existing users
   - Generate SEC Regulation D records for existing investments
   - Create share certificates for completed investments

5. PERFORMANCE OPTIMIZATION:
   - All new tables include appropriate indexes for query performance
   - Composite indexes support common query patterns
   - Foreign key constraints ensure data integrity

6. COMPLIANCE MIGRATION:
   - Existing users start with PENDING compliance status
   - KYC/AML verification will need to be completed for active users
   - GDPR consent will need to be obtained from existing users

7. ROLLBACK PLAN:
   - Migration can be rolled back by dropping new tables
   - Existing data remains unaffected during migration process
*/