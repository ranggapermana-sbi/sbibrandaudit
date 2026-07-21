ALTER TABLE audit_submissions ADD COLUMN IF NOT EXISTS unlocked_by TEXT;
ALTER TABLE audit_submissions ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;
