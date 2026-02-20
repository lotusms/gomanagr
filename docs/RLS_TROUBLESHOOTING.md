# RLS Troubleshooting Guide

## Error: "new row violates row-level security policy"

This error means RLS is blocking the insert, even though the API should be using service role.

### Quick Fix Steps:

1. **Verify Service Role Key is Set:**
   ```bash
   # Check .env.local file
   grep SUPABASE_SERVICE_ROLE_KEY .env.local
   
   # Should show something like:
   # SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Run the RLS Fix Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: migrations/003_fix_user_profiles_rls.sql
   ```

3. **Verify Service Role Key Format:**
   - Should start with `eyJ` (JWT token)
   - Should be the full key from Supabase Dashboard → Settings → API → `service_role` key (secret)

4. **Check API Route Logs:**
   - Look for: `[API] Supabase Admin initialized successfully`
   - If you see warnings about service key format, fix it

### Common Issues:

#### Issue 1: Service Role Key Not Set
**Symptom:** API returns 503 "Service unavailable"

**Fix:** Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### Issue 2: Wrong Key Used
**Symptom:** RLS errors even with service role

**Fix:** 
- Go to Supabase Dashboard → Settings → API
- Copy the `service_role` key (NOT the `anon` key)
- It's the secret key, not the public key

#### Issue 3: RLS Still Blocking
**Symptom:** Service role initialized but still getting RLS errors

**Fix:**
- Service role SHOULD bypass RLS entirely
- If it's not, check:
  1. Key is correct (starts with `eyJ`)
  2. Key is from the right project
  3. Restart dev server after adding key

### Testing Service Role:

```sql
-- In Supabase SQL Editor, test if service role bypasses RLS:
-- This should work even with RLS enabled
INSERT INTO user_profiles (id, email, first_name, last_name)
VALUES (gen_random_uuid(), 'test@example.com', 'Test', 'User');
```

If this fails, RLS might be misconfigured. The service role should bypass it.

### Alternative: Temporarily Disable RLS (Development Only)

```sql
-- ONLY FOR DEVELOPMENT/TESTING
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** Never disable RLS in production!

### Verify Fix:

After running `003_fix_user_profiles_rls.sql`, test signup again. The API should:
1. ✅ Initialize service role client successfully
2. ✅ Insert into user_profiles without RLS errors
3. ✅ Create organization
4. ✅ Create org_membership
5. ✅ If any step fails, delete auth user automatically
