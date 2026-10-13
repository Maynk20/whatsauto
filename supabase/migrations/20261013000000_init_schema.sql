-- WhatsAuto Initial Schema Migration
-- Migration: 20261013000000_init_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'cancelled')),
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns (user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns (status);

-- ============================================================================
-- 2. MESSAGE QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    recipient_name TEXT,
    final_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    provider_message_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_attempt_at TIMESTAMPTZ,
    error_log TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mq_user_status ON public.message_queue (user_id, status);
CREATE INDEX IF NOT EXISTS idx_mq_worker_claim ON public.message_queue (status, scheduled_at, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_mq_campaign_id ON public.message_queue (campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mq_user_idempotency ON public.message_queue (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 3. STATUS UPDATES TABLE (Stories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video')),
    media_path TEXT,
    caption TEXT,
    bg_color TEXT NOT NULL DEFAULT '#128C7E',
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_su_user_id ON public.status_updates (user_id, status);
CREATE INDEX IF NOT EXISTS idx_su_worker_claim ON public.status_updates (status, scheduled_at);

-- ============================================================================
-- 4. DEVICE SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL DEFAULT 'Primary Device',
    provider TEXT NOT NULL CHECK (provider IN ('cloud_api', 'baileys_experimental')),
    phone_number TEXT,
    connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'error')),
    last_heartbeat TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ds_user_id ON public.device_sessions (user_id);

-- ============================================================================
-- 5. DELIVERY LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID,
    job_type TEXT NOT NULL CHECK (job_type IN ('message', 'status_update')),
    event_type TEXT NOT NULL CHECK (event_type IN ('queued', 'attempted', 'delivered', 'failed', 'cancelled')),
    status TEXT NOT NULL,
    sanitized_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_dl_user_job ON public.delivery_logs (user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_dl_created_at ON public.delivery_logs (created_at DESC);

-- ============================================================================
-- 6. ATOMIC WORKER CLAIM FUNCTIONS (FOR UPDATE SKIP LOCKED)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_queue_jobs(
    p_batch_size INT DEFAULT 10
)
RETURNS SETOF public.message_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH eligible_jobs AS (
        SELECT id
        FROM public.message_queue
        WHERE status = 'pending'
          AND (scheduled_at IS NULL OR scheduled_at <= timezone('utc'::text, now()))
          AND (next_attempt_at IS NULL OR next_attempt_at <= timezone('utc'::text, now()))
        ORDER BY created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.message_queue mq
    SET status = 'processing',
        attempt_count = mq.attempt_count + 1,
        updated_at = timezone('utc'::text, now())
    FROM eligible_jobs
    WHERE mq.id = eligible_jobs.id
    RETURNING mq.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_status_jobs(
    p_batch_size INT DEFAULT 5
)
RETURNS SETOF public.status_updates
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH eligible_status_jobs AS (
        SELECT id
        FROM public.status_updates
        WHERE status = 'pending'
          AND scheduled_at <= timezone('utc'::text, now())
        ORDER BY scheduled_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.status_updates su
    SET status = 'processing',
        attempt_count = su.attempt_count + 1,
        updated_at = timezone('utc'::text, now())
    FROM eligible_status_jobs
    WHERE su.id = eligible_status_jobs.id
    RETURNING su.*;
END;
$$;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

-- Campaigns Policies
CREATE POLICY "Users view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- Message Queue Policies
CREATE POLICY "Users view own message queue" ON public.message_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own message queue" ON public.message_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own message queue" ON public.message_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own message queue" ON public.message_queue FOR DELETE USING (auth.uid() = user_id);

-- Status Updates Policies
CREATE POLICY "Users view own status updates" ON public.status_updates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own status updates" ON public.status_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own status updates" ON public.status_updates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own status updates" ON public.status_updates FOR DELETE USING (auth.uid() = user_id);

-- Device Sessions Policies
CREATE POLICY "Users manage own device sessions" ON public.device_sessions FOR ALL USING (auth.uid() = user_id);

-- Delivery Logs Policies
CREATE POLICY "Users view own delivery logs" ON public.delivery_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 8. STORAGE BUCKET CONFIGURATION & POLICIES (status-media)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'status-media',
    'status-media',
    false,
    16777216, -- 16MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 16777216,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[];

-- Allow users to upload only into a folder named with their user_id
CREATE POLICY "Authenticated users upload status media to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'status-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view and download their own status media
CREATE POLICY "Authenticated users view own status media"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'status-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own status media
CREATE POLICY "Authenticated users delete own status media"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'status-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 9. REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'message_queue'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_queue;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'status_updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.status_updates;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'device_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.device_sessions;
    END IF;
END $$;
