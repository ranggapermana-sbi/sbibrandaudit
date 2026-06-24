-- ====================================================================
-- SUPABASE SQL SCRIPT TO ADD filled_by_hotel TOGGLE COLUMN
-- ====================================================================
-- This script adds the 'filled_by_hotel' boolean toggle to the 
-- 'public.audit_items' table. It sets a default of 'TRUE' so that
-- existing checklist items remain visible for hotel self-audits.
-- ====================================================================

-- 1. Add column to audit_items table if it does not already exist
ALTER TABLE public.audit_items 
ADD COLUMN IF NOT EXISTS filled_by_hotel BOOLEAN DEFAULT TRUE;

-- 2. Backfill existing items to have filled_by_hotel = TRUE
UPDATE public.audit_items 
SET filled_by_hotel = TRUE 
WHERE filled_by_hotel IS NULL;

-- 3. (Optional) Print status check
COMMENT ON COLUMN public.audit_items.filled_by_hotel IS 'Whether the checklist item is filled by the hotel (TRUE) or auditor-only (FALSE)';
