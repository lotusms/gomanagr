-- Migration: Wipe all data from tables and storage buckets
-- WARNING: This will delete ALL data but keep table structures and buckets
-- Run this only if you want to reset your database completely

-- Disable foreign key checks temporarily (PostgreSQL doesn't have this, so we delete in order)
-- Delete in reverse order of dependencies to avoid foreign key violations

-- Step 1: Delete from tables with foreign keys first (child tables)
DELETE FROM org_invites;
DELETE FROM org_members;
DELETE FROM organizations;
DELETE FROM user_profiles;

-- Step 2: Clear storage buckets
-- Note: These commands need to be run via Supabase Storage API or dashboard
-- Or use the Supabase client in a script

-- For company-logos bucket:
-- You can use Supabase Dashboard: Storage > company-logos > Select All > Delete
-- Or use this SQL function (if you have storage admin access):

-- Function to list all files in a bucket (for reference)
-- SELECT name FROM storage.objects WHERE bucket_id = 'company-logos';

-- Function to delete all files in a bucket:
-- DELETE FROM storage.objects WHERE bucket_id = 'company-logos';

-- Function to delete all files in team-photos bucket:
-- DELETE FROM storage.objects WHERE bucket_id = 'team-photos';

-- Alternative: Use Supabase JS client to clear buckets:
-- 
-- import { createClient } from '@supabase/supabase-js';
-- const supabase = createClient(url, serviceKey);
-- 
-- // List all files
-- const { data: files } = await supabase.storage.from('company-logos').list();
-- 
-- // Delete all files
-- if (files && files.length > 0) {
--   const filePaths = files.map(f => f.name);
--   await supabase.storage.from('company-logos').remove(filePaths);
-- }
-- 
-- // Same for team-photos
-- const { data: teamFiles } = await supabase.storage.from('team-photos').list();
-- if (teamFiles && teamFiles.length > 0) {
--   const teamFilePaths = teamFiles.map(f => f.name);
--   await supabase.storage.from('team-photos').remove(teamFilePaths);
-- }

-- Reset sequences (if you have any auto-increment sequences)
-- This ensures new IDs start from 1 again
-- Note: UUIDs don't use sequences, but if you have any serial columns, reset them:
-- ALTER SEQUENCE IF EXISTS your_sequence_name RESTART WITH 1;

-- Verify tables are empty
SELECT 
  'user_profiles' as table_name, COUNT(*) as row_count FROM user_profiles
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'org_members', COUNT(*) FROM org_members
UNION ALL
SELECT 'org_invites', COUNT(*) FROM org_invites;
