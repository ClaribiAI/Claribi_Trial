-- Migration: Add session_token column and RLS policies
-- This enables session-based access control instead of IP-based

-- Step 1: Add session_token column to powerbi_file_summaries table
ALTER TABLE powerbi_file_summaries 
ADD COLUMN IF NOT EXISTS session_token VARCHAR(36);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_powerbi_file_summaries_session_token 
ON powerbi_file_summaries(session_token);

-- Step 3: Enable Row Level Security on the table
ALTER TABLE powerbi_file_summaries ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS powerbi_file_summaries_session_policy ON powerbi_file_summaries;

-- Step 5: Create RLS policy: Users can only see/modify their own files
-- The policy uses the PostgreSQL session variable 'app.session_token' 
-- which is set by the application middleware
CREATE POLICY powerbi_file_summaries_session_policy ON powerbi_file_summaries
    FOR ALL
    USING (
        -- Allow access if session_token matches the session variable
        session_token = current_setting('app.session_token', true)
        -- Allow system/admin queries when session_token is NULL (bypass RLS)
        OR current_setting('app.session_token', true) IS NULL
    )
    WITH CHECK (
        -- For INSERT/UPDATE, ensure session_token matches
        session_token = current_setting('app.session_token', true)
        OR current_setting('app.session_token', true) IS NULL
    );

-- Step 6: Optional - Migrate existing IP-based records
-- This generates a session token for each existing record based on IP
-- Note: This is a one-time migration. Users will need to re-upload files
-- or you can provide a migration tool to map old IPs to new tokens.
-- 
-- Uncomment and modify if you want to migrate existing data:
/*
DO $$
DECLARE
    rec RECORD;
    new_token UUID;
BEGIN
    FOR rec IN 
        SELECT DISTINCT ms_object_id 
        FROM powerbi_file_summaries 
        WHERE session_token IS NULL 
        AND ms_object_id IS NOT NULL
    LOOP
        -- Generate a unique token for this IP
        new_token := gen_random_uuid();
        
        -- Update all records with this IP
        UPDATE powerbi_file_summaries
        SET session_token = new_token::text
        WHERE ms_object_id = rec.ms_object_id
        AND session_token IS NULL;
        
        RAISE NOTICE 'Migrated IP % to token %', rec.ms_object_id, new_token;
    END LOOP;
END $$;
*/

-- Verification queries (run these to verify the migration):
-- SELECT COUNT(*) FROM powerbi_file_summaries WHERE session_token IS NULL;
-- SELECT COUNT(*) FROM powerbi_file_summaries WHERE session_token IS NOT NULL;


