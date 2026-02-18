# Fix: user_id Column Must Match id (Supabase Auth UUID)

## Problem

The `user_id` column was NULL in migrated rows, which breaks RLS (Row Level Security) policies that check `user_id = auth.uid()`. Even though our RLS policies use `id = auth.uid()`, having `user_id` set correctly ensures compatibility and consistency.

## Solution

### 1. Run Migration SQL

Run this migration in Supabase SQL Editor:

```sql
-- File: supabase/migrations/002_fix_user_id.sql
```

This will:
- Add `user_id` column if it doesn't exist
- Backfill all existing rows: `user_id = id`
- Add constraint to ensure `user_id = id` always
- Make `user_id` NOT NULL

### 2. Code Updates

All code has been updated to ensure `user_id = id`:

✅ **userService.js** - `createUserAccount()` now sets `user_id = id`  
✅ **Migration script** - Sets `user_id = id` when migrating  
✅ **Re-migrate script** - Sets `user_id = id` when re-migrating  

### 3. For New Users

All new user registrations will automatically have `user_id = id` because:
- `createUserAccount()` explicitly sets `row.user_id = userId`
- `accountToRow()` sets `user_id` when `userId` is provided

## Verification

After running the migration, verify:

```sql
-- Check for any NULL user_id values
SELECT id, user_id FROM user_account WHERE user_id IS NULL;

-- Should return 0 rows

-- Verify all user_id = id
SELECT id, user_id FROM user_account WHERE user_id != id;

-- Should return 0 rows
```

## Files Changed

- `supabase/migrations/002_fix_user_id.sql` - New migration
- `services/userService.js` - Always sets `user_id = id` in `createUserAccount()`
- `scripts/migrate-firebase-to-supabase.js` - Sets `user_id` when migrating
- `scripts/remigrate-user.js` - Sets `user_id` when re-migrating
