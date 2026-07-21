ALTER TABLE audit_submissions ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT false;
