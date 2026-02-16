#!/usr/bin/env node

/**
 * Development utility: Import teamMembers array from JSON file to Firestore useraccount document.
 * 
 * Usage:
 *   node functions/importTeamMembers.js <userId> <json-file-path>
 *   node functions/importTeamMembers.js i6beWdN28CQx14CYd9kuu18kF3p2 teamMembers-i6beWdN28CQx14CYd9kuu18kF3p2-2026-02-16T11-52-52.json
 * 
 * Example:
 *   node functions/importTeamMembers.js i6beWdN28CQx14CYd9kuu18kF3p2 teamMembers-i6beWdN28CQx14CYd9kuu18kF3p2-2026-02-16T11-52-52.json
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Get command-line arguments
const args = process.argv.slice(2);
const userId = args[0];
const jsonFilePath = args[1];

if (!userId) {
  console.error('❌ Error: User ID is required');
  console.log('\nUsage:');
  console.log('  node functions/importTeamMembers.js <userId> <json-file-path>');
  console.log('\nExample:');
  console.log('  node functions/importTeamMembers.js i6beWdN28CQx14CYd9kuu18kF3p2 teamMembers-i6beWdN28CQx14CYd9kuu18kF3p2-2026-02-16T11-52-52.json');
  process.exit(1);
}

if (!jsonFilePath) {
  console.error('❌ Error: JSON file path is required');
  console.log('\nUsage:');
  console.log('  node functions/importTeamMembers.js <userId> <json-file-path>');
  process.exit(1);
}

// Initialize Firebase Admin
let serviceAccount = null;

// Try to load service account from default location
try {
  const defaultPath = join(__dirname, '..', 'gomanagr-845b4-firebase-adminsdk-fbsvc-ad93840423.json');
  const fileContent = readFileSync(defaultPath, 'utf8');
  serviceAccount = JSON.parse(fileContent);
  console.log('✅ Loaded Firebase Admin credentials');
} catch (error) {
  console.error('❌ Failed to load Firebase Admin credentials:', error.message);
  console.error('Please ensure the service account JSON file exists in the project root');
  process.exit(1);
}

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = getFirestore();

async function importTeamMembers() {
  try {
    // Resolve JSON file path (relative to functions folder or absolute)
    let jsonPath = jsonFilePath;
    if (!existsSync(jsonPath)) {
      // Try relative to functions folder
      jsonPath = join(__dirname, jsonFilePath);
      if (!existsSync(jsonPath)) {
        console.error(`❌ JSON file not found: ${jsonFilePath}`);
        console.error(`   Tried: ${jsonFilePath}`);
        console.error(`   Tried: ${jsonPath}`);
        process.exit(1);
      }
    }

    console.log(`\n📥 Reading JSON file: ${jsonPath}...`);
    const fileContent = readFileSync(jsonPath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Extract teamMembers array
    const teamMembers = jsonData.teamMembers || jsonData.teamMembers || [];
    
    if (!Array.isArray(teamMembers)) {
      console.error('❌ Error: teamMembers must be an array');
      process.exit(1);
    }

    if (teamMembers.length === 0) {
      console.warn('⚠️  Warning: teamMembers array is empty');
      const response = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        readline.question('Do you want to continue and clear all team members? (yes/no): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
      });
      
      if (!response) {
        console.log('❌ Import cancelled');
        process.exit(0);
      }
    }

    console.log(`\n📊 Found ${teamMembers.length} team members in JSON file`);
    
    // Verify user account exists
    console.log(`\n🔍 Verifying user account for userId: ${userId}...`);
    const userAccountRef = db.collection('useraccount').doc(userId);
    const doc = await userAccountRef.get();
    
    if (!doc.exists) {
      console.error(`❌ No user account found for userId: ${userId}`);
      console.error('   Please create the user account first');
      process.exit(1);
    }

    const currentData = doc.data();
    const currentTeamMembers = currentData?.teamMembers || [];
    console.log(`   Current team members in Firestore: ${currentTeamMembers.length}`);

    // Show summary
    console.log(`\n📋 Import Summary:`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Current team members: ${currentTeamMembers.length}`);
    console.log(`   - New team members: ${teamMembers.length}`);
    console.log(`   - Change: ${teamMembers.length - currentTeamMembers.length > 0 ? '+' : ''}${teamMembers.length - currentTeamMembers.length}`);

    // Confirm before proceeding
    console.log(`\n⚠️  This will REPLACE all existing team members in Firestore!`);
    const confirm = await new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      readline.question('Do you want to proceed? (yes/no): ', (answer) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });

    if (!confirm) {
      console.log('❌ Import cancelled');
      process.exit(0);
    }

    // Update Firestore document
    console.log(`\n💾 Updating Firestore document...`);
    await userAccountRef.set(
      {
        teamMembers: teamMembers,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`\n✅ Team members imported successfully!`);
    console.log(`\n📊 Final Summary:`);
    console.log(`   - Total team members: ${teamMembers.length}`);
    if (teamMembers.length > 0) {
      console.log(`   - Members with photos: ${teamMembers.filter(m => m.pictureUrl && m.pictureUrl.trim()).length}`);
      console.log(`   - Members with roles: ${teamMembers.filter(m => m.role).length}`);
      console.log(`   - Unique roles: ${[...new Set(teamMembers.map(m => m.role).filter(Boolean))].join(', ')}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error importing team members:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importTeamMembers();
