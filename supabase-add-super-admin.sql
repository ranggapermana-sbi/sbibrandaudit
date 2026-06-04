-- ====================================================================
-- CREATE OR UPDATE SUPER ADMIN USER
-- ====================================================================

-- 1. Insert if not exists
INSERT INTO public.audit_users (display_name, email, access_level, role)
SELECT 'Super Admin', 'brandaudit@swiss-belhotel.com', 'admin', 'Admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_users WHERE email = 'brandaudit@swiss-belhotel.com'
);

-- 2. Update if exists
UPDATE public.audit_users
SET access_level = 'admin',
    role = 'Admin',
    display_name = 'Super Admin'
WHERE email = 'brandaudit@swiss-belhotel.com';
