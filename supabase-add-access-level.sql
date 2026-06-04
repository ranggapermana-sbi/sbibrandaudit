-- ====================================================================
-- ENSURE ACCESS_LEVEL COLUMN EXISTS IN PUBLIC.AUDIT_USERS
-- ====================================================================

-- 1. Add column if it doesn't exist
ALTER TABLE public.audit_users ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'auditee';

-- 2. Ensure existing records have default value
UPDATE public.audit_users SET access_level = 'auditee' WHERE access_level IS NULL;
