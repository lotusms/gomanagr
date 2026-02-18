-- Ensure RLS policies work correctly for updates
-- This migration ensures that updates work even if user_id column exists

-- Drop and recreate update policy to be more explicit
drop policy if exists "Users can update own account" on public.user_account;

-- Recreate with explicit check for both id and user_id (if column exists)
create policy "Users can update own account"
  on public.user_account for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Also ensure user_id matches id on update (if column exists)
-- This constraint should already exist from migration 002, but ensure it's there
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'user_account' 
    and column_name = 'user_id'
  ) then
    -- Add trigger to ensure user_id always equals id on update
    create or replace function ensure_user_id_equals_id()
    returns trigger as $$
    begin
      new.user_id := new.id;
      return new;
    end;
    $$ language plpgsql;

    drop trigger if exists ensure_user_id_equals_id_trigger on public.user_account;
    create trigger ensure_user_id_equals_id_trigger
      before update on public.user_account
      for each row
      execute function ensure_user_id_equals_id();
  end if;
end $$;

comment on policy "Users can update own account" on public.user_account is 'Users can only update their own row. Checks auth.uid() = id.';
