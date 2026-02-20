-- Migration: Fix user_profiles UPDATE RLS policy
-- The UPDATE policy needs WITH CHECK clause to allow updates
-- Also ensure no accidental INSERTs can happen

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Policy: Users can update their own profile
-- USING clause checks existing row, WITH CHECK clause validates the update
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Verify INSERT policy is still blocking direct inserts (should already exist from migration 003)
-- This ensures updates don't accidentally become inserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Prevent direct profile creation'
  ) THEN
    CREATE POLICY "Prevent direct profile creation"
      ON user_profiles FOR INSERT
      WITH CHECK (false);
  END IF;
END $$;
