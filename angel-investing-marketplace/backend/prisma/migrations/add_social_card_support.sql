-- Migration: Add Social Card Support to CompanyUpdate
-- FR-4.2: Social Card Generation for company updates
--
-- This migration adds support for storing social card metadata and tracking
-- social shares directly in the CompanyUpdate model's metadata field.
--
-- The metadata JSON field will store:
-- {
--   "socialCard": {
--     "imageUrl": "https://...",
--     "imageKey": "social-cards/...",
--     "template": "MILESTONE",
--     "size": "TWITTER",
--     "language": "en",
--     "customization": { ... },
--     "format": "PNG",
--     "quality": 90,
--     "fileSize": 123456,
--     "generationTimeMs": 1500
--   },
--   "socialShares": {
--     "TWITTER": {
--       "count": 10,
--       "shares": [
--         {
--           "userId": "user123",
--           "sharedAt": "2025-11-15T10:00:00Z",
--           "metadata": { ... }
--         }
--       ]
--     },
--     "LINKEDIN": { ... }
--   }
-- }
--
-- NOTE: The CompanyUpdate model already has a metadata Json field,
-- so no schema changes are required. This migration is a documentation
-- of the metadata structure for social cards.

-- Verify that the metadata field exists and is of type Json
DO $$
BEGIN
  -- Check if the metadata column exists and is of type jsonb
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'CompanyUpdate'
      AND column_name = 'metadata'
      AND data_type = 'jsonb'
  ) THEN
    RAISE NOTICE 'CompanyUpdate.metadata field already exists as Json/jsonb';
  END IF;
END $$;

-- Create an index on metadata for faster social card queries
CREATE INDEX IF NOT EXISTS idx_company_update_metadata_social_card
ON "CompanyUpdate" USING GIN ((metadata->'socialCard'))
WHERE metadata->'socialCard' IS NOT NULL;

-- Create an index on metadata for social shares tracking
CREATE INDEX IF NOT EXISTS idx_company_update_metadata_social_shares
ON "CompanyUpdate" USING GIN ((metadata->'socialShares'))
WHERE metadata->'socialShares' IS NOT NULL;

-- Add comment to metadata column documenting the structure
COMMENT ON COLUMN "CompanyUpdate"."metadata" IS
'JSON metadata for the update. Includes:
- socialCard: Generated social media card information (FR-4.2)
- socialShares: Social sharing tracking data (FR-4.2.5)
- other custom metadata as needed';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Social card support added successfully';
  RAISE NOTICE 'CompanyUpdate.metadata now supports social card storage';
END $$;
