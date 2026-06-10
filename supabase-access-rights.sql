-- ====================================================================
-- CREATE ACCESS RIGHTS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.access_rights (
    id SERIAL PRIMARY KEY,
    access_level TEXT NOT NULL,
    subview TEXT NOT NULL,
    UNIQUE(access_level, subview)
);

-- Insert initial mappings
INSERT INTO public.access_rights (access_level, subview) VALUES
('auditor', 'dashboard'),
('auditor', 'departments'),
('auditor', 'categories'),
('auditor', 'items'),
('auditor', 'groups'),
('auditor', 'batches'),
('auditor', 'hotels')
ON CONFLICT DO NOTHING;
