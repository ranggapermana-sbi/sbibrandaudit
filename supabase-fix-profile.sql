-- ====================================================================
-- FIX EXISTING PROFILE ONBOARDING FOR RANGGA
-- ====================================================================

-- Update ranggapermana@swiss-belhotel.com to have mandatory fields if missing
UPDATE public.audit_users
SET first_name = COALESCE(first_name, 'Rangga'),
    last_name = COALESCE(last_name, 'Permana'),
    role = COALESCE(role, 'General Manager'),
    hotel_id = COALESCE(hotel_id, '1') -- Use a valid hotel_id
WHERE email = 'ranggapermana@swiss-belhotel.com';
