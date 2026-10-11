# WhatsAuto

**Automated WhatsApp Stories & Campaign Engine**

Premium dark-mode React app for scheduling WhatsApp status stories, managing direct campaign sends, pairing devices with phone code linking, and tracking live dispatch queues.

## Stack

- React + Vite
- Tailwind CSS
- Lucide React icons
- Supabase (database, storage, realtime)

## Local setup

```bash
npm install
npm run dev
```

Create `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase SQL + storage setup

Run:

- `/home/runner/work/whatsauto/whatsauto/supabase/schema.sql`

This creates and configures:

- `status_updates`
- `message_queue`
- `device_sessions`
- public storage bucket: `status-media`
- RLS policies (public/authenticated read-write)
- realtime replication for `status_updates`, `message_queue`
