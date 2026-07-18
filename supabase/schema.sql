create table if not exists public.meals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  cooked_dates bigint[] not null default '{}',
  rejection_dates bigint[] not null default '{}',
  consecutive_rejections integer not null default 0 check (consecutive_rejections >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meals enable row level security;
create policy "Users can read their own meals" on public.meals for select using (auth.uid() = user_id);
create policy "Users can add their own meals" on public.meals for insert with check (auth.uid() = user_id);
create policy "Users can update their own meals" on public.meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own meals" on public.meals for delete using (auth.uid() = user_id);
create index if not exists meals_user_id_idx on public.meals(user_id);
