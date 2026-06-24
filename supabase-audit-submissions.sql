-- SQL Script to create audit_submissions table
-- Copy and paste this into the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id VARCHAR(255),
    item_id BIGINT REFERENCES audit_items(id) ON DELETE CASCADE,
    input_type VARCHAR(50),
    value TEXT,
    is_na BOOLEAN DEFAULT false,
    na_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, item_id)
);
