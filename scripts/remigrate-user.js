#!/usr/bin/env node

/**
 * Re-migrate a specific user with detailed logging
 * Useful for debugging why data didn't migrate correctly
 * 
 * Usage:
 *   node scripts/remigrate-user.js <firebase-user-id>
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

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

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/remigrate-user.js <firebase-user-id>');
  process.exit(1);
}

let serviceAccount = null;
try {
  const backupPath = join(__dirname, '..', 'firebase_bkp', 'gomanagr-845b4-firebase-adminsdk-fbsvc-ad93840423.json');
  const rootPath = join(__dirname, '..', 'gomanagr-845b4-firebase-adminsdk-fbsvc-ad93840423.json');
  
  let filePath;
  if (existsSync(backupPath)) {
    filePath = backupPath;
  } else if (existsSync(rootPath)) {
    filePath = rootPath;
  } else {
    throw new Error('Service account file not found');
  }
  
  const fileContent = readFileSync(filePath, 'utf8');
  serviceAccount = JSON.parse(fileContent);
} catch (error) {
  console.error('❌ Failed to load Firebase Admin credentials:', error.message);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const adminAuth = getAuth();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
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

async function remigrate() {
  try {
    console.log(`\n🔄 Re-migrating user: ${userId}\n`);

    console.log('1️⃣  Fetching Firestore document...');
    const docRef = db.collection('useraccount').doc(userId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.error('❌ No useraccount document found in Firestore');
      process.exit(1);
    }

    const firebaseData = doc.data();
    console.log(`   ✅ Found document`);
    console.log(`   📊 Keys: ${Object.keys(firebaseData).join(', ')}`);
    console.log(`   📊 Email: ${firebaseData.email || 'N/A'}`);
    console.log(`   📊 Team members: ${firebaseData.teamMembers?.length || 0}`);
    console.log(`   📊 Clients: ${firebaseData.clients?.length || 0}`);

    console.log('\n2️⃣  Getting Firebase Auth user...');
    let firebaseAuthUser;
    try {
      firebaseAuthUser = await adminAuth.getUser(userId);
      console.log(`   ✅ Auth user found: ${firebaseAuthUser.email}`);
    } catch (err) {
      console.warn(`   ⚠️  Auth user not found, using Firestore email`);
      firebaseAuthUser = { email: firebaseData.email };
    }

    console.log('\n3️⃣  Checking Supabase Auth...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === firebaseAuthUser.email);
    
    let supabaseUserId;
    if (existing) {
      supabaseUserId = existing.id;
      console.log(`   ✅ User exists: ${supabaseUserId}`);
    } else {
      console.log(`   ➕ Creating new user...`);
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: firebaseAuthUser.email,
        email_confirm: true,
      });
      if (error) throw error;
      supabaseUserId = newUser.user.id;
      console.log(`   ✅ Created: ${supabaseUserId}`);
    }

    console.log('\n4️⃣  Transforming data...');
    const supabaseRow = transformToSupabaseRow(firebaseData, supabaseUserId);
    supabaseRow.user_id = supabaseUserId; // Ensure user_id = id for RLS
    console.log(`   ✅ Transformed`);
    console.log(`   📊 Row keys: ${Object.keys(supabaseRow).join(', ')}`);
    console.log(`   📊 Team members: ${supabaseRow.team_members?.length || 0}`);
    console.log(`   📊 Clients: ${supabaseRow.clients?.length || 0}`);

    console.log('\n5️⃣  Checking existing Supabase row...');
    const { data: existingRow } = await supabase
      .from('user_account')
      .select('*')
      .eq('id', supabaseUserId)
      .single();
    
    if (existingRow) {
      console.log(`   ⚠️  Row exists but may be empty`);
      console.log(`   📊 Existing keys: ${Object.keys(existingRow).join(', ')}`);
    } else {
      console.log(`   ➕ No existing row, will create new`);
    }

    console.log('\n6️⃣  Upserting to Supabase...');
    const { data, error } = await supabase
      .from('user_account')
      .upsert(supabaseRow, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Error:`, error);
      throw error;
    }

    console.log(`   ✅ Success!`);
    console.log(`   📊 Inserted keys: ${Object.keys(data || {}).join(', ')}`);
    console.log(`   📊 Team members: ${data?.team_members?.length || 0}`);
    console.log(`   📊 Clients: ${data?.clients?.length || 0}`);

    console.log('\n✅ Re-migration complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

remigrate();
