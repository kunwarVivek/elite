-- Test database initialization script

-- Create test users
INSERT INTO users (id, email, name, role, is_verified, created_at, updated_at) VALUES
('test-founder-user', 'founder@test.com', 'Test Founder', 'FOUNDER', true, NOW(), NOW()),
('test-investor-user', 'investor@test.com', 'Test Investor', 'INVESTOR', true, NOW(), NOW()),
('test-admin-user', 'admin@test.com', 'Test Admin', 'ADMIN', true, NOW(), NOW()),
('test-unverified-user', 'unverified@test.com', 'Unverified User', 'INVESTOR', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test user profiles
INSERT INTO user_profiles (id, user_id, bio, location, investment_range_min, investment_range_max, accreditation_status, kyc_status, created_at, updated_at) VALUES
('test-founder-profile', 'test-founder-user', 'Experienced founder building innovative solutions', 'San Francisco, CA', NULL, NULL, 'VERIFIED', 'VERIFIED', NOW(), NOW()),
('test-investor-profile', 'test-investor-user', 'Angel investor focused on early-stage startups', 'New York, NY', 10000, 100000, 'VERIFIED', 'VERIFIED', NOW(), NOW()),
('test-admin-profile', 'test-admin-user', 'Platform administrator', 'Remote', NULL, NULL, 'VERIFIED', 'VERIFIED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test startups
INSERT INTO startups (id, name, slug, description, industry, stage, funding_goal, current_funding, founder_id, is_verified, created_at, updated_at) VALUES
('test-startup-1', 'TechCorp Inc', 'techcorp-inc', 'Revolutionary SaaS platform for businesses', 'Technology', 'MVP', 1000000, 250000, 'test-founder-user', true, NOW(), NOW()),
('test-startup-2', 'HealthTech Solutions', 'healthtech-solutions', 'AI-powered healthcare platform', 'Healthcare', 'GROWTH', 2000000, 750000, 'test-founder-user', true, NOW() - INTERVAL '30 days', NOW()),
('test-startup-3', 'FinTech Innovations', 'fintech-innovations', 'Next-generation financial services', 'Fintech', 'PROTOTYPE', 500000, 0, 'test-founder-user', false, NOW() - INTERVAL '7 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test pitches
INSERT INTO pitches (id, startup_id, title, summary, funding_amount, equity_offered, minimum_investment, status, created_at, updated_at) VALUES
('test-pitch-1', 'test-startup-1', 'Revolutionary SaaS Platform - Seed Round', 'AI-powered platform transforming business operations', 1000000, 10, 25000, 'ACTIVE', NOW(), NOW()),
('test-pitch-2', 'test-startup-2', 'HealthTech Series A', 'Expanding AI healthcare platform to new markets', 2000000, 15, 50000, 'ACTIVE', NOW() - INTERVAL '15 days', NOW()),
('test-pitch-3', 'test-startup-3', 'FinTech Pre-seed', 'Building next-generation financial tools', 500000, 20, 10000, 'UNDER_REVIEW', NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test investments
INSERT INTO investments (id, investor_id, pitch_id, amount, equity_percentage, status, investment_type, created_at, updated_at) VALUES
('test-investment-1', 'test-investor-user', 'test-pitch-1', 50000, 0.5, 'COMPLETED', 'DIRECT', NOW() - INTERVAL '10 days', NOW()),
('test-investment-2', 'test-investor-user', 'test-pitch-2', 75000, 0.375, 'ESCROW', 'DIRECT', NOW() - INTERVAL '5 days', NOW()),
('test-investment-3', 'test-investor-user', 'test-pitch-1', 25000, 0.25, 'PENDING', 'DIRECT', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test transactions
INSERT INTO transactions (id, investment_id, user_id, type, amount, status, payment_method, created_at, updated_at) VALUES
('test-transaction-1', 'test-investment-1', 'test-investor-user', 'INVESTMENT', 50000, 'COMPLETED', 'BANK_TRANSFER', NOW() - INTERVAL '10 days', NOW()),
('test-transaction-2', 'test-investment-2', 'test-investor-user', 'INVESTMENT', 75000, 'PROCESSING', 'CARD', NOW() - INTERVAL '5 days', NOW()),
('test-transaction-3', 'test-investment-3', 'test-investor-user', 'INVESTMENT', 25000, 'PENDING', 'BANK_TRANSFER', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test portfolios
INSERT INTO portfolios (id, investor_id, name, description, total_invested, total_value, investment_count, created_at, updated_at) VALUES
('test-portfolio-1', 'test-investor-user', 'Technology Investments', 'Early-stage technology startup investments', 150000, 175000, 3, NOW() - INTERVAL '30 days', NOW()),
('test-portfolio-2', 'test-investor-user', 'Healthcare Portfolio', 'Healthcare and biotech investments', 75000, 90000, 1, NOW() - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test messages
INSERT INTO messages (id, sender_id, receiver_id, pitch_id, content, is_read, created_at, updated_at) VALUES
('test-message-1', 'test-founder-user', 'test-investor-user', 'test-pitch-1', 'Thank you for your investment! We are excited to have you on board.', true, NOW() - INTERVAL '9 days', NOW()),
('test-message-2', 'test-investor-user', 'test-founder-user', 'test-pitch-2', 'I am very interested in your healthcare platform. Can we schedule a call?', false, NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test notifications
INSERT INTO notifications (id, user_id, type, title, content, is_read, created_at, updated_at) VALUES
('test-notification-1', 'test-investor-user', 'INVESTMENT_UPDATE', 'Investment Completed', 'Your investment in TechCorp Inc has been successfully processed.', true, NOW() - INTERVAL '10 days', NOW()),
('test-notification-2', 'test-founder-user', 'INVESTMENT_UPDATE', 'New Investment Received', 'You have received a new investment in your pitch.', false, NOW() - INTERVAL '5 days', NOW()),
('test-notification-3', 'test-investor-user', 'PITCH_UPDATE', 'Pitch Fully Funded', 'Congratulations! The pitch you invested in has reached its funding goal.', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test documents
INSERT INTO documents (id, startup_id, pitch_id, name, file_path, file_url, file_type, file_size, is_public, uploaded_by, created_at, updated_at) VALUES
('test-document-1', 'test-startup-1', 'test-pitch-1', 'Pitch_Deck_v2.pdf', '/documents/pitch_deck_v2.pdf', 'https://cdn.example.com/documents/pitch_deck_v2.pdf', 'PITCH_DECK', 2048576, true, 'test-founder-user', NOW() - INTERVAL '20 days', NOW()),
('test-document-2', 'test-startup-1', 'test-pitch-1', 'Financial_Projections.xlsx', '/documents/financial_projections.xlsx', 'https://cdn.example.com/documents/financial_projections.xlsx', 'FINANCIAL_STATEMENT', 512000, false, 'test-founder-user', NOW() - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create some test comments
INSERT INTO comments (id, pitch_id, user_id, content, is_approved, created_at, updated_at) VALUES
('test-comment-1', 'test-pitch-1', 'test-investor-user', 'This looks like a great opportunity! The market potential is huge.', true, NOW() - INTERVAL '8 days', NOW()),
('test-comment-2', 'test-pitch-2', 'test-investor-user', 'Impressive technology. How do you plan to scale?', true, NOW() - INTERVAL '4 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better test performance
CREATE INDEX IF NOT EXISTS CONCURRENTLY idx_test_users_email ON users(email);
CREATE INDEX IF NOT EXISTS CONCURRENTLY idx_test_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS CONCURRENTLY idx_test_pitches_status ON pitches(status);
CREATE INDEX IF NOT EXISTS CONCURRENTLY idx_test_transactions_status ON transactions(status);

-- Add some sample data for load testing
DO $$
DECLARE
    i INTEGER := 1;
    user_id TEXT;
    startup_id TEXT;
    pitch_id TEXT;
BEGIN
    -- Create additional test users for load testing
    FOR i IN 1..50 LOOP
        user_id := 'load_user_' || i;
        INSERT INTO users (id, email, name, role, is_verified, created_at, updated_at)
        VALUES (user_id, 'loaduser' || i || '@test.com', 'Load User ' || i, 'INVESTOR', true, NOW() - (random() * interval '90 days'), NOW())
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- Create additional test startups for load testing
    FOR i IN 1..25 LOOP
        startup_id := 'load_startup_' || i;
        INSERT INTO startups (id, name, slug, description, industry, stage, funding_goal, current_funding, founder_id, is_verified, created_at, updated_at)
        VALUES (
            startup_id,
            'Load Startup ' || i,
            'load-startup-' || i,
            'Load testing startup ' || i,
            (ARRAY['Technology', 'Healthcare', 'Fintech', 'E-commerce'])[(random() * 3 + 1)::int],
            (ARRAY['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH'])[(random() * 3 + 1)::int],
            (random() * 5000000 + 100000)::int,
            (random() * 1000000)::int,
            'test-founder-user',
            random() > 0.3,
            NOW() - (random() * interval '180 days'),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Update current funding for startups based on investments
UPDATE startups
SET current_funding = (
    SELECT COALESCE(SUM(amount), 0)
    FROM investments
    WHERE investments.pitch_id IN (
        SELECT id FROM pitches WHERE pitches.startup_id = startups.id
    )
    AND investments.status = 'COMPLETED'
);

-- Create database functions for testing
CREATE OR REPLACE FUNCTION get_test_user_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM users);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_test_startup_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM startups);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_test_investment_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM investments);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions for test user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO test;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO test;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO test;