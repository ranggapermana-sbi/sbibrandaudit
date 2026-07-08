-- Add category_ids and item_ids columns to support filtering the auditee screen by group checklist criteria.
ALTER TABLE audit_checklist_groups ADD COLUMN IF NOT EXISTS category_ids TEXT[] DEFAULT '{}';
ALTER TABLE audit_checklist_groups ADD COLUMN IF NOT EXISTS item_ids TEXT[] DEFAULT '{}';
