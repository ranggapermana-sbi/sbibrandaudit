-- ====================================================================
-- SUPABASE SQL MIGRATION FOR PORTAL APPROVAL DETAILS
-- ====================================================================
-- This script adds details of the admin who approved each user profile
-- and the timestamp of approval to 'public.audit_users'.
-- ====================================================================

-- 1. Add 'approved_by_name' column if it doesn't exist
ALTER TABLE public.audit_users ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

-- 2. Add 'approved_at' column if it doesn't exist
ALTER TABLE public.audit_users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
