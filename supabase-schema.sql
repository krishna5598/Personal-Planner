-- Run this entire script in Supabase Dashboard > SQL Editor.
create table if not exists public.daymark_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.daymark_user_data enable row level security;

-- A signed-in user can only read and change their own Daymark backup row.
drop policy if exists "Users can read their own Daymark data" on public.daymark_user_data;
create policy "Users can read their own Daymark data"
  on public.daymark_user_data for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Daymark data" on public.daymark_user_data;
create policy "Users can insert their own Daymark data"
  on public.daymark_user_data for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Daymark data" on public.daymark_user_data;
create policy "Users can update their own Daymark data"
  on public.daymark_user_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
