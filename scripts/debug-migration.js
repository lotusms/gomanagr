#!/usr/bin/env node

/**
 * Debug script to check what data exists in Firestore and what would be migrated
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv').config({ path: join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
let serviceAccount = null;
try {
  const { existsSync } = require('fs');
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

async function debugUserAccount(userId) {
  try {
    console.log(`\n🔍 Debugging user: ${userId}\n`);

    // Check Firestore document
    const userAccountRef = db.collection('useraccount').doc(userId);
    const doc = await userAccountRef.get();
    
    if (!doc.exists) {
      console.log('❌ No useraccount document found in Firestore');
      return;
    }

    const firestoreData = doc.data();
    console.log('📄 Firestore Document Data:');
    console.log(JSON.stringify(firestoreData, null, 2));
    console.log(`\n📊 Data Summary:`);
    console.log(`   - Email: ${firestoreData.email || 'N/A'}`);
    console.log(`   - First Name: ${firestoreData.firstName || 'N/A'}`);
    console.log(`   - Last Name: ${firestoreData.lastName || 'N/A'}`);
    console.log(`   - Company Name: ${firestoreData.companyName || 'N/A'}`);
    console.log(`   - Team Members: ${firestoreData.teamMembers?.length || 0}`);
    console.log(`   - Clients: ${firestoreData.clients?.length || 0}`);
    console.log(`   - Services: ${firestoreData.services?.length || 0}`);
    console.log(`   - Appointments: ${firestoreData.appointments?.length || 0}`);

    // Check Firebase Auth user
    try {
      const authUser = await adminAuth.getUser(userId);
      console.log(`\n👤 Firebase Auth User:`);
      console.log(`   - Email: ${authUser.email}`);
      console.log(`   - UID: ${authUser.uid}`);
    } catch (err) {
      console.log(`\n⚠️  Firebase Auth user not found: ${err.message}`);
    }

    // Transform to show what would be inserted
    console.log(`\n🔄 Transformed Data (what would go to Supabase):`);
    const transformed = {
      id: 'SUPABASE_UUID_HERE',
      email: firestoreData.email || null,
      trial: firestoreData.trial ?? true,
      first_name: firestoreData.firstName || null,
      last_name: firestoreData.lastName || null,
      purpose: firestoreData.purpose || null,
      role: firestoreData.role || null,
      company_name: firestoreData.companyName || null,
      company_logo: firestoreData.companyLogo || '',
      team_size: firestoreData.teamSize || null,
      company_size: firestoreData.companySize || null,
      company_locations: firestoreData.companyLocations || null,
      sections_to_track: firestoreData.sectionsToTrack || [],
      referral_source: firestoreData.referralSource || null,
      selected_palette: firestoreData.selectedPalette || 'palette1',
      dismissed_todo_ids: firestoreData.dismissedTodoIds || [],
      team_members: firestoreData.teamMembers || [],
      clients: firestoreData.clients || [],
      services: firestoreData.services || [],
      appointments: firestoreData.appointments || [],
      created_at: firestoreData.createdAt || new Date().toISOString(),
      updated_at: firestoreData.updatedAt || new Date().toISOString(),
    };

    // Check for extra fields
    const knownKeys = new Set([
      'userId', 'email', 'trial', 'firstName', 'lastName', 'purpose', 'role',
      'companyName', 'companyLogo', 'teamSize', 'companySize', 'companyLocations',
      'sectionsToTrack', 'referralSource', 'selectedPalette', 'dismissedTodoIds',
      'teamMembers', 'clients', 'services', 'appointments', 'createdAt', 'updatedAt',
    ]);

    const profile = {};
    Object.entries(firestoreData).forEach(([key, value]) => {
      if (!knownKeys.has(key) && value !== undefined && value !== null) {
        profile[key] = value;
      }
    });

    if (Object.keys(profile).length > 0) {
      transformed.profile = profile;
      console.log(`   Extra fields in profile: ${Object.keys(profile).join(', ')}`);
    }

    console.log(JSON.stringify(transformed, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node scripts/debug-migration.js <firebase-user-id>');
  console.log('\nExample:');
  console.log('  node scripts/debug-migration.js i6beWdN28CQx14CYd9kuu18kF3p2');
  process.exit(1);
}

debugUserAccount(userId).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
