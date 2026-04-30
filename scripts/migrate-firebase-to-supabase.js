#!/usr/bin/env node

/**
 * Migrate Firebase Firestore useraccount data to Supabase
 * 
 * This script:
 * 1. Exports all useraccount documents from Firestore
 * 2. Creates users in Supabase Auth (if they don't exist)
 * 3. Transforms data (camelCase → snake_case)
 * 4. Imports into Supabase user_account table
 * 
 * Prerequisites:
 * - Firebase Admin SDK credentials (see scripts/lib/loadFirebaseServiceAccount.js: env path or firebase_bkp/service-account.json)
 * - Supabase project URL and service_role key in .env.local
 * - Supabase user_account table created (run migration first)
 * 
 * Usage:
 *   node scripts/migrate-firebase-to-supabase.js
 *   node scripts/migrate-firebase-to-supabase.js --dry-run
 *   node scripts/migrate-firebase-to-supabase.js --user-id <firebase-uid>
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { loadFirebaseServiceAccount } = require('./lib/loadFirebaseServiceAccount');

const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const DRY_RUN = process.argv.includes('--dry-run');
const USER_ID_FILTER = process.argv.includes('--user-id') 
  ? process.argv[process.argv.indexOf('--user-id') + 1]
  : null;

const repoRoot = join(__dirname, '..');
let serviceAccount = null;
try {
  serviceAccount = loadFirebaseServiceAccount(repoRoot);
  console.log('✅ Loaded Firebase Admin credentials');
} catch (error) {
  console.error('❌ Failed to load Firebase Admin credentials:', error.message);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
  console.log('✅ Firebase Admin initialized');
}

const db = getFirestore();
const adminAuth = getAuth();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (get from Supabase Dashboard > Settings > API)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function transformToSupabaseRow(firebaseData, supabaseUserId) {
  const row = {
    id: supabaseUserId,
    user_id: supabaseUserId, // Always set user_id = id for RLS compatibility
    email: firebaseData.email || null,
    trial: firebaseData.trial ?? true,
    first_name: firebaseData.firstName || null,
    last_name: firebaseData.lastName || null,
    purpose: firebaseData.purpose || null,
    role: firebaseData.role || null,
    company_name: firebaseData.companyName || null,
    company_logo: firebaseData.companyLogo || '',
    team_size: firebaseData.teamSize || null,
    company_size: firebaseData.companySize || null,
    company_locations: firebaseData.companyLocations || null,
    sections_to_track: firebaseData.sectionsToTrack || [],
    referral_source: firebaseData.referralSource || null,
    selected_palette: firebaseData.selectedPalette || 'palette1',
    dismissed_todo_ids: firebaseData.dismissedTodoIds || [],
    team_members: firebaseData.teamMembers || [],
    clients: firebaseData.clients || [],
    services: firebaseData.services || [],
    appointments: firebaseData.appointments || [],
    created_at: firebaseData.createdAt || new Date().toISOString(),
    updated_at: firebaseData.updatedAt || new Date().toISOString(),
  };

  const knownKeys = new Set([
    'userId', 'email', 'trial', 'firstName', 'lastName', 'purpose', 'role',
    'companyName', 'companyLogo', 'teamSize', 'companySize', 'companyLocations',
    'sectionsToTrack', 'referralSource', 'selectedPalette', 'dismissedTodoIds',
    'teamMembers', 'clients', 'services', 'appointments', 'createdAt', 'updatedAt',
  ]);

  const profile = {};
  Object.entries(firebaseData).forEach(([key, value]) => {
    if (!knownKeys.has(key) && value !== undefined && value !== null) {
      profile[key] = value;
    }
  });

  if (Object.keys(profile).length > 0) {
    row.profile = profile;
  }

  return row;
}

async function ensureSupabaseUser(firebaseUser) {
  try {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === firebaseUser.email);

    if (existing) {
      console.log(`   ✓ User exists in Supabase Auth: ${existing.id}`);
      return existing.id;
    }

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would create user in Supabase Auth: ${firebaseUser.email}`);
      return 'dry-run-uuid-placeholder';
    }

    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: firebaseUser.email,
      email_confirm: true, // Auto-confirm email
    });

    if (error) throw error;

    console.log(`   ✓ Created user in Supabase Auth: ${newUser.user.id}`);
    return newUser.user.id;
  } catch (error) {
    console.error(`   ❌ Failed to create/check Supabase user: ${error.message}`);
    throw error;
  }
}

async function migrateUserAccount(firebaseUserId, firebaseData) {
  try {
    console.log(`\n📦 Migrating user: ${firebaseUserId}`);
    console.log(`   Email: ${firebaseData.email || 'N/A'}`);
    
    console.log(`   📊 Firestore data keys: ${Object.keys(firebaseData).join(', ')}`);
    console.log(`   📊 Team members: ${firebaseData.teamMembers?.length || 0}`);
    console.log(`   📊 Clients: ${firebaseData.clients?.length || 0}`);
    console.log(`   📊 Services: ${firebaseData.services?.length || 0}`);

    let firebaseAuthUser;
    try {
      firebaseAuthUser = await adminAuth.getUser(firebaseUserId);
    } catch (err) {
      console.warn(`   ⚠️  Firebase Auth user not found, using email from Firestore`);
      firebaseAuthUser = { email: firebaseData.email };
    }

    const supabaseUserId = await ensureSupabaseUser(firebaseAuthUser);

    const supabaseRow = transformToSupabaseRow(firebaseData, supabaseUserId);
    
    console.log(`   🔄 Transformed row keys: ${Object.keys(supabaseRow).join(', ')}`);
    console.log(`   🔄 Team members in row: ${supabaseRow.team_members?.length || 0}`);
    console.log(`   🔄 Clients in row: ${supabaseRow.clients?.length || 0}`);

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would insert/update row:`, JSON.stringify(supabaseRow, null, 2));
      return { success: true, supabaseUserId };
    }

    console.log(`   💾 Upserting to Supabase...`);
    const { data, error } = await supabase
      .from('user_account')
      .upsert(supabaseRow, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Supabase error:`, error);
      throw error;
    }

    console.log(`   ✅ Migrated successfully`);
    console.log(`   📊 Inserted data keys: ${Object.keys(data || {}).join(', ')}`);
    return { success: true, supabaseUserId, data };
  } catch (error) {
    console.error(`   ❌ Migration failed: ${error.message}`);
    console.error(`   ❌ Full error:`, error);
    return { success: false, error: error.message };
  }
}

async function migrateAll() {
  try {
    console.log('\n🚀 Starting Firebase → Supabase migration');
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    let snapshot;
    if (USER_ID_FILTER) {
      const docRef = db.collection('useraccount').doc(USER_ID_FILTER);
      const doc = await docRef.get();
      snapshot = { 
        size: doc.exists ? 1 : 0,
        docs: doc.exists ? [doc] : []
      };
    } else {
      snapshot = await db.collection('useraccount').get();
    }
    const total = snapshot.size;

    if (total === 0) {
      console.log('❌ No useraccount documents found');
      return;
    }

    console.log(`\n📊 Found ${total} user account(s) to migrate\n`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (const doc of snapshot.docs) {
      const firebaseUserId = doc.id;
      const firebaseData = doc.data();

      const result = await migrateUserAccount(firebaseUserId, firebaseData);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Total: ${total}`);

    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no data was actually migrated');
      console.log('   Run without --dry-run to perform the migration');
    } else {
      console.log('\n✅ Migration complete!');
      console.log('\n⚠️  IMPORTANT: Users will need to reset their passwords');
      console.log('   They can use the "Forgot Password" flow in the app');
    }
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateAll().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
