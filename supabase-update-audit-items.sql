-- SQL Script to add 'result' column to 'audit_items' table
-- Copy and paste this into the Supabase SQL Editor

ALTER TABLE audit_items
ADD COLUMN result int2;

-- If you prefer it to have a default value (e.g., 0) and not allow NULLs, use this instead:
-- ALTER TABLE audit_items
-- ADD COLUMN result int2 NOT NULL DEFAULT 0;
