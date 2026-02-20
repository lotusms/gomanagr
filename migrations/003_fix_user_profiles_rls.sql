-- Migration: Fix user_profiles RLS policies
-- IMPORTANT: Service role key bypasses RLS, but we need policies for regular users

-- Enable RLS on user_profiles (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Prevent direct profile creation" ON user_profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Policy: Prevent direct inserts from client (must use API route with service role)
-- Note: Service role key bypasses RLS, so API routes will work
-- This policy only blocks client-side direct inserts
CREATE POLICY "Prevent direct profile creation"
  ON user_profiles FOR INSERT
  WITH CHECK (false);

-- IMPORTANT: The API route uses SUPABASE_SERVICE_ROLE_KEY which bypasses ALL RLS policies
-- If you're still getting RLS errors, check:
-- 1. SUPABASE_SERVICE_ROLE_KEY is set in .env.local
-- 2. The key is correct (starts with 'eyJ...')
-- 3. The API route is using supabaseAdmin (service role client), not regular supabase client
