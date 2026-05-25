create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  input_method text not null check (input_method in ('text','image','github')),
  source_excerpt text not null,
  source_full text,
  github_path text,
  language text not null,
  functionality jsonb not null,
  purpose text not null
);

alter table public.analyses enable row level security;

create policy "Users can view their own analyses"
  on public.analyses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.analyses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.analyses for delete
  to authenticated
  using (auth.uid() = user_id);

create index analyses_user_created_idx on public.analyses(user_id, created_at desc);