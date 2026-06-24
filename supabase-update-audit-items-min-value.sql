-- SQL Script to add 'min_value' column to 'audit_items' table
-- Copy and paste this into the Supabase SQL Editor

ALTER TABLE audit_items
ADD COLUMN min_value numeric;
