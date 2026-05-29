-- ====================================================================
-- SUPABASE SQL SCRIPT FOR PORTAL ONBOARDING & USER MANAGEMENT
-- ====================================================================
-- This script provisions the 'public.audit_users' table to accommodate 
-- user registration, profile onboarding, and designated properties.
--
-- It automatically synchronizes authentication metadata (email, display name,
-- user creation time, and last sign-in timestamp) from Supabase Auth (auth.users)
-- into public.audit_users using a highly performant PostgreSQL trigger function.
-- ====================================================================

-- 1. Create the Audit Users Table under the Public schema
CREATE TABLE IF NOT EXISTS public.audit_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    is_brand_audit_lead BOOLEAN DEFAULT FALSE,
    hotel_id TEXT,
    hotel_name TEXT,
    hotel_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Turn on Row Level Security (RLS) for extra security compliance
ALTER TABLE public.audit_users ENABLE ROW LEVEL SECURITY;

-- 3. Provision Public Policies for Access Right Management
-- Allow anyone to read audit_users (e.g. to display list in Admin User Management)
CREATE POLICY "Enable read access for all authenticated users" 
ON public.audit_users 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow individual users to insert or update their own user records
CREATE POLICY "Enable insert/update access for users to their own user record" 
ON public.audit_users 
FOR ALL 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 4. Create trigger function to sync core security details from auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.audit_users (
    id,
    email,
    display_name,
    created_at,
    last_sign_in_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'name', 
        split_part(new.email, '@', 1)
    ),
    new.created_at,
    new.last_sign_in_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'name', 
        EXCLUDED.display_name, 
        split_part(new.email, '@', 1)
    ),
    last_sign_in_at = COALESCE(new.last_sign_in_at, public.audit_users.last_sign_in_at),
    created_at = COALESCE(new.created_at, public.audit_users.created_at),
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Bind trigger to the auth.users system table
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

-- ====================================================================
-- VIEW METRIC EXAMPLE: dd-mm-yyyy hh:mm:ss can be simulated with:
-- to_char(created_at, 'DD-MM-YYYY HH24:MI:SS')
-- to_char(last_sign_in_at, 'DD-MM-YYYY HH24:MI:SS')
-- ====================================================================
