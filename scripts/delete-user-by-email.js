#!/usr/bin/env node

/**
 * Find and delete all Supabase records for a user by email (invites, account, auth).
 * Use this to clean up test invites/accounts (e.g. Allison).
 *
 * Does NOT touch admin dashboard data (e.g. team_members in user_profiles).
 *
 * Usage:
 *   node scripts/delete-user-by-email.js <email>
 * Example:
 *   node scripts/delete-user-by-email.js allison@example.com
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const emailArg = args.find((a) => a.includes('@'));
if (!emailArg) {
  console.error('Usage: node scripts/delete-user-by-email.js <email> [--dry-run]');
  console.error('Example: node scripts/delete-user-by-email.js allison@example.com');
  console.error('         node scripts/delete-user-by-email.js allison@example.com --dry-run');
  process.exit(1);
}

const targetEmail = emailArg.trim().toLowerCase();
if (dryRun) console.log('DRY RUN – no changes will be made\n');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('Error listing auth users:', error.message);
      return null;
    }
    const user = (data?.users || []).find((u) => (u.email || '').toLowerCase() === email);
    if (user) return user;
    if (!data?.users?.length || data.users.length < perPage) return null;
    page++;
  }
}

async function main() {
  console.log('\nLooking for records for email:', targetEmail);
  console.log('---\n');

  // 1) org_invites (any invite for this email)
  const { data: invites, error: invErr } = await supabase
    .from('org_invites')
    .select('id, email, used, created_at')
    .ilike('email', targetEmail);

  if (invErr) {
    console.error('Error fetching org_invites:', invErr.message);
  } else if (invites?.length) {
    console.log(`Found ${invites.length} invite(s) for ${targetEmail}:`);
    invites.forEach((i) => console.log('  -', i.id, i.email, i.used ? '(used)' : '(unused)', i.created_at));
    if (!dryRun) {
      const ids = invites.map((i) => i.id);
      const { error: delInvErr } = await supabase.from('org_invites').delete().in('id', ids);
      if (delInvErr) console.error('Error deleting org_invites:', delInvErr.message);
      else console.log('Deleted org_invites for', targetEmail);
    } else {
      console.log('(Would delete these invites)');
    }
  } else {
    console.log('No org_invites found for', targetEmail);
  }
  console.log('');

  // 2) Auth user by email
  const authUser = await findAuthUserByEmail(targetEmail);
  if (!authUser) {
    console.log('No auth user found with email', targetEmail);
    console.log('Done. (Only invites were checked/deleted.)\n');
    return;
  }

  const userId = authUser.id;
  console.log('Found auth user:', userId, authUser.email);
  console.log('');

  // 3) org_members
  const { data: members, error: memErr } = await supabase
    .from('org_members')
    .select('id, organization_id, role')
    .eq('user_id', userId);

  if (memErr) {
    console.error('Error fetching org_members:', memErr.message);
  } else if (members?.length) {
    console.log(`Found ${members.length} org_members row(s) for user ${userId}`);
    if (!dryRun) {
      const { error: delMemErr } = await supabase.from('org_members').delete().eq('user_id', userId);
      if (delMemErr) console.error('Error deleting org_members:', delMemErr.message);
      else console.log('Deleted org_members for user', userId);
    } else {
      console.log('(Would delete these org_members)');
    }
  } else {
    console.log('No org_members for user', userId);
  }
  console.log('');

  // 4) user_profiles
  const { data: profile, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, email, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  if (profErr) {
    console.error('Error fetching user_profiles:', profErr.message);
  } else if (profile) {
    console.log('Found user_profiles:', profile.id, profile.email, profile.first_name, profile.last_name);
    if (!dryRun) {
      const { error: delProfErr } = await supabase.from('user_profiles').delete().eq('id', userId);
      if (delProfErr) console.error('Error deleting user_profiles:', delProfErr.message);
      else console.log('Deleted user_profiles for', userId);
    } else {
      console.log('(Would delete this user_profiles row)');
    }
  } else {
    console.log('No user_profiles row for user', userId);
  }
  console.log('');

  // 5) auth user (must be last; some FKs may reference it)
  if (!dryRun) {
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      console.error('Error deleting auth user:', delAuthErr.message);
    } else {
      console.log('Deleted auth user', userId, targetEmail);
    }
  } else {
    console.log('(Would delete auth user', userId, targetEmail + ')');
  }

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
