-- InsightBoard V2.0.1.1: account-private report snapshots.
-- Store aggregate analytics and filters, not imported raw rows.
create extension if not exists pgcrypto;

create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 140),
  dataset_name text not null check (char_length(dataset_name) <= 160),
  record_count integer not null default 0 check (record_count >= 0),
  filters jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  ai_summary text,
  summary_language text,
  created_at timestamptz not null default now()
);

create index if not exists saved_reports_user_created_idx
  on public.saved_reports (user_id, created_at desc);

alter table public.saved_reports enable row level security;
revoke all on table public.saved_reports from anon;
grant select, insert, delete on table public.saved_reports to authenticated;

drop policy if exists "Users can read their own reports" on public.saved_reports;
create policy "Users can read their own reports"
  on public.saved_reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save their own reports" on public.saved_reports;
create policy "Users can save their own reports"
  on public.saved_reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own reports" on public.saved_reports;
create policy "Users can delete their own reports"
  on public.saved_reports for delete to authenticated
  using (auth.uid() = user_id);
