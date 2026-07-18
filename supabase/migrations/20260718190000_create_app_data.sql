-- One private document for the household's meal collection.
-- The browser cannot access this table. Only the Vercel API uses a secret key.
create table if not exists public.app_data (
  id text primary key,
  meals jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

-- Intentionally no public policies: anon and authenticated clients have no rows.
-- The server-only Supabase secret key uses the service_role and bypasses RLS.
