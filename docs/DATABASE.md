# WhatsAuto Database Documentation

## 1. Relational Schema Design

WhatsAuto uses Supabase PostgreSQL as its single source of truth. All tables reside in the `public` schema and enforce:
- Primary keys formatted as UUID (`gen_random_uuid()`).
- Foreign key references to `auth.users(id) ON DELETE CASCADE` for multi-tenant isolation.
- Automatic `created_at` and `updated_at` timestamps using UTC (`TIMESTAMPTZ`).
- Row Level Security (RLS) on every table without exception.

---

## 2. Table Specifications

### 2.1. `campaigns`
Groups batches of approved messages.
```sql
CREATE TABLE public.campaigns (
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
```

### 2.2. `message_queue`
Core transactional table for individual direct messages.
```sql
CREATE TABLE public.message_queue (
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
```
**Constraints & Indexes**:
- `CREATE UNIQUE INDEX idx_mq_idempotency ON public.message_queue (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`
- `CREATE INDEX idx_mq_worker_claim ON public.message_queue (status, scheduled_at, next_attempt_at);`
- `CREATE INDEX idx_mq_user_status ON public.message_queue (user_id, status);`
- `CREATE INDEX idx_mq_campaign ON public.message_queue (campaign_id);`

### 2.3. `status_updates`
Stores scheduled WhatsApp stories and status broadcasts.
```sql
CREATE TABLE public.status_updates (
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
```

### 2.4. `device_sessions`
Tracks active provider sessions and connection statuses.
```sql
CREATE TABLE public.device_sessions (
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
```

### 2.5. `delivery_logs`
Audit log for job and delivery status transitions.
```sql
CREATE TABLE public.delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID,
    job_type TEXT NOT NULL CHECK (job_type IN ('message', 'status_update')),
    event_type TEXT NOT NULL CHECK (event_type IN ('queued', 'attempted', 'delivered', 'failed', 'cancelled')),
    status TEXT NOT NULL,
    sanitized_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

---

## 3. High-Concurrency Job Claiming Function

To prevent duplicate job execution across multiple worker threads or cluster nodes, an atomic database function using `FOR UPDATE SKIP LOCKED` is implemented:

```sql
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
```

---

## 4. Row Level Security (RLS) Policies

All tables enable RLS:
```sql
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
```

Each table enforces ownership:
```sql
-- Campaigns
CREATE POLICY "Users view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- Message Queue
CREATE POLICY "Users view own queue" ON public.message_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own queue" ON public.message_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own queue" ON public.message_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own queue" ON public.message_queue FOR DELETE USING (auth.uid() = user_id);

-- Status Updates
CREATE POLICY "Users view own status updates" ON public.status_updates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own status updates" ON public.status_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own status updates" ON public.status_updates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own status updates" ON public.status_updates FOR DELETE USING (auth.uid() = user_id);

-- Device Sessions
CREATE POLICY "Users manage own device sessions" ON public.device_sessions FOR ALL USING (auth.uid() = user_id);

-- Delivery Logs
CREATE POLICY "Users read own delivery logs" ON public.delivery_logs FOR SELECT USING (auth.uid() = user_id);
```

---

## 5. Storage Bucket Policies (`status-media`)
Bucket configuration:
- Bucket ID: `status-media`
- Public: `false`
- Max file size: 16 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`

RLS policy for storage objects:
```sql
CREATE POLICY "Allow authenticated user uploads to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to read own objects"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);
```
