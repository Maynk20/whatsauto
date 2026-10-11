-- WhatsAuto schema setup
create extension if not exists pgcrypto;

create table if not exists public.status_updates (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('text', 'image', 'video')),
  media_url text,
  caption text,
  bg_color text default '#25D366',
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'failed', 'cancelled')),
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.message_queue (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  recipient_name text,
  final_message text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  error_log text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  phone_number text,
  pairing_code text,
  is_connected boolean not null default false,
  last_heartbeat timestamptz not null default now()
);

alter table public.status_updates enable row level security;
alter table public.message_queue enable row level security;
alter table public.device_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'status_updates' and policyname = 'status_updates_public_rw'
  ) then
    create policy status_updates_public_rw on public.status_updates
      for all
      to public, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'message_queue' and policyname = 'message_queue_public_rw'
  ) then
    create policy message_queue_public_rw on public.message_queue
      for all
      to public, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'device_sessions' and policyname = 'device_sessions_public_rw'
  ) then
    create policy device_sessions_public_rw on public.device_sessions
      for all
      to public, authenticated
      using (true)
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'status_updates'
  ) then
    alter publication supabase_realtime add table public.status_updates;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_queue'
  ) then
    alter publication supabase_realtime add table public.message_queue;
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('status-media', 'status-media', true)
on conflict (id) do update set public = excluded.public;
