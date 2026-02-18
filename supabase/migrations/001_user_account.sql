-- User account table (replaces Firestore useraccount collection)
-- Row key = auth.uid()

create table if not exists public.user_account (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  trial boolean default true,
  first_name text,
  last_name text,
  purpose text,
  role text,
  company_name text,
  company_logo text default '',
  team_size text,
  company_size text,
  company_locations text,
  sections_to_track jsonb default '[]',
  referral_source text,
  selected_palette text default 'palette1',
  dismissed_todo_ids jsonb default '[]',
  team_members jsonb default '[]',
  clients jsonb default '[]',
  services jsonb default '[]',
  appointments jsonb default '[]',
  profile jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: users can only read/update their own row
alter table public.user_account enable row level security;

create policy "Users can read own account"
  on public.user_account for select
  using (auth.uid() = id);

create policy "Users can insert own account"
  on public.user_account for insert
  with check (auth.uid() = id);

create policy "Users can update own account"
  on public.user_account for update
  using (auth.uid() = id);

-- Storage buckets (create in Supabase Dashboard > Storage or via API)
-- company-logos: public or private with RLS
-- team-photos: same

comment on table public.user_account is 'User profile and app data; id = auth.uid()';
