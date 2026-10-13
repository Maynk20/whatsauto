# WhatsAuto 🚀
> Production-Oriented WhatsApp Automation, Scheduling, and Queue Dashboard.

WhatsAuto provides a unified platform for WhatsApp broadcast campaigns, status scheduling, device session tracking, and queue management with real-time feedback.

---

## Architecture At A Glance

- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + Supabase SDK + PapaParse.
- **Backend API**: Node.js + Express (ES Modules) with JWT Auth, CORS, Helmet, and Rate Limiting.
- **Background Workers**: Story Scheduler and Queue Worker with atomic claiming via PostgreSQL `claim_queue_jobs()` function.
- **Data & Auth**: Supabase PostgreSQL with Row Level Security (RLS), Supabase Storage (`status-media`), and Supabase Realtime.
- **Provider Layer**: Pluggable WhatsApp Provider Adapter (Meta WhatsApp Business Cloud API + Mock/Experimental Adapter boundary).

---

## Project Structure

```text
whatsauto/
├── frontend/             # React (Vite) Web Dashboard
├── backend/              # Node.js Express API & Background Workers
├── supabase/             # Supabase Config & SQL Migrations
├── docs/                 # Architecture, Database, Security, API, and Deployment Docs
├── .gitignore
├── README.md
└── package.json
```

---

## Quick Start

### 1. Prerequisites
- Node.js >= 20.x
- Supabase account & project

### 2. Setup Database & Migrations
Execute the migrations located in `supabase/migrations/20261013000000_init_schema.sql` via Supabase CLI (`supabase db push`) or the Supabase SQL Editor.

### 3. Run Locally
```bash
# Install dependencies
npm install

# Start both backend and frontend concurrently
npm run dev
```

For detailed guides, refer to:
- [Architecture Guide](file:///docs/ARCHITECTURE.md)
- [Database Schema & RLS](file:///docs/DATABASE.md)
- [API Documentation](file:///docs/API.md)
- [Security Model](file:///docs/SECURITY.md)
- [Deployment Guide](file:///docs/DEPLOYMENT.md)
