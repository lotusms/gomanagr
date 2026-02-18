-- Fix user_id column to match id (Supabase Auth UUID)
-- This ensures RLS policies work correctly

-- Add user_id column if it doesn't exist
alter table public.user_account 
add column if not exists user_id uuid;

-- Set user_id = id for all existing rows (backfill)
update public.user_account 
set user_id = id 
where user_id is null;

-- Make user_id NOT NULL and add constraint
alter table public.user_account 
alter column user_id set not null;

-- Add unique constraint (user_id should always equal id)
alter table public.user_account 
add constraint user_id_equals_id check (user_id = id);

-- Note: We don't set a default here because user_id must equal id (the auth UUID)
-- Application code (userService.js) will always set user_id = id when creating/updating rows

comment on column public.user_account.user_id is 'Same as id (Supabase Auth UUID). Set to match id for RLS compatibility.';
