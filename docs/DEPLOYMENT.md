# WhatsAuto Deployment & Operations Guide

## 1. Hosting Architecture Overview

WhatsAuto requires distinct hosting targets for its components:
1. **Frontend**: Static SPA hosted on Vercel, Netlify, or AWS S3 + CloudFront.
2. **Backend & Worker**: Persistent Node.js runtime (Render, Railway, Fly.io, or VPS) supporting persistent background worker processes and outbound network sockets.
3. **Database & Storage**: Managed Supabase instance (PostgreSQL, Auth, Storage, Realtime).

> [!IMPORTANT]
> Deploying the frontend does NOT automatically deploy the Node.js backend. Furthermore, Supabase Edge Functions are stateless and cannot substitute for a persistent long-running worker process.

---

## 2. Environment Variables

### 2.1. Backend (`/backend/.env`)
```bash
# Server Port & Host
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://whatsauto.yourdomain.com

# Supabase Credentials (from Dashboard -> Project Settings -> API)
SUPABASE_URL=https://qqionludknbtileytmck.supabase.co
SUPABASE_ANON_KEY=sb_publishable_3qsXJP31bVN8kCmba7N2Yw_FRKZ6Iex
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# WhatsApp Provider Configuration (Default: cloud_api)
WHATSAPP_PROVIDER=cloud_api
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_WABA_ID=your_meta_waba_id
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_secret_string

# Worker Settings
WORKER_POLL_INTERVAL_MS=3000
WORKER_BATCH_SIZE=10
WORKER_RATE_LIMIT_DELAY_MS=500
```

### 2.2. Frontend (`/frontend/.env`)
```bash
VITE_SUPABASE_URL=https://qqionludknbtileytmck.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_3qsXJP31bVN8kCmba7N2Yw_FRKZ6Iex
VITE_API_URL=https://api-whatsauto.yourdomain.com
```

---

## 3. Database Migration Deployment

Run migrations against the Supabase project:
```bash
# Method 1: Using Supabase CLI
supabase db push

# Method 2: Direct Postgres Connection via psql or Supabase SQL Editor
# Execute supabase/migrations/20261013000000_init_schema.sql directly in the Supabase Dashboard SQL Editor.
```

---

## 4. Production Readiness Checklist

- [ ] All database tables have RLS enabled and tested.
- [ ] Supabase storage bucket `status-media` created and set to private.
- [ ] PostgreSQL atomic claim function `claim_queue_jobs` executed and available.
- [ ] Backend environment contains verified `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Meta Webhook URL configured with HTTPS and verify token matching `.env`.
- [ ] CORS origin restricted to the production frontend domain.
- [ ] Health probe (`/health`) configured in the container or hosting monitor.
- [ ] Process manager (PM2 / Docker) configured with automatic restart on exit.

---

## 5. Rollback Procedure
1. **Frontend**: Instant rollback in Vercel/Netlify dashboard to previous deployment commit.
2. **Backend**: Redeploy previous Docker container tag or Git tag commit.
3. **Database**: If a migration fails, inspect the rollback migration file and revert schema changes while preserving user data.
