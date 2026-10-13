-- Seed data for WhatsAuto development
-- Note: User IDs must correspond to actual auth.users IDs in Supabase.
-- This file provides structure for testing environments.

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'status-media',
    'status-media',
    false,
    16777216,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]
)
ON CONFLICT (id) DO NOTHING;
