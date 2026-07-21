-- Copy and paste this into your Supabase SQL Editor to create the 'documents' storage bucket

-- Create 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access controls (RLS policies) for the 'documents' bucket
-- Note: Replace the role checks with more restrictive ones in production if needed

-- Allow public read access to all files in the bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'documents' );

-- Allow public insert access for uploading documents
CREATE POLICY "Public Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'documents' );

-- Allow public update/delete if you want users to replace files
CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'documents' );

CREATE POLICY "Public Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'documents' );
