-- ====================================================================
-- SUPABASE SQL MIGRATION FOR PORTAL REVIEW & APPROVAL PROCESS
-- ====================================================================
-- This script adds the 'is_approved' field to 'public.audit_users' 
-- to implement a restricted admin approval gates before accessing the system.
-- ====================================================================

-- 1. Add 'is_approved' boolean column if it doesn't exist
ALTER TABLE public.audit_users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 2. Mark existing users as approved so they do not get locked out
UPDATE public.audit_users SET is_approved = TRUE WHERE is_approved IS NULL;

-- 3. Always ensure the brandaudit super admin is marked as approved and active
UPDATE public.audit_users SET is_approved = TRUE WHERE email = 'brandaudit@swiss-belhotel.com';
