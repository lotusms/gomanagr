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
const { loadFirebaseServiceAccount } = require('../../scripts/lib/loadFirebaseServiceAccount');

const REPO_ROOT = join(__dirname, '../..');

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

try {
  serviceAccount = loadFirebaseServiceAccount(REPO_ROOT);
  console.log('✅ Loaded Firebase Admin credentials');
} catch (error) {
  console.error('❌ Failed to load Firebase Admin credentials:', error.message);
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
    
    // Check for duplicates in JSON file
    console.log(`\n🔍 Checking for duplicates in JSON file...`);
    const ids = teamMembers.map(m => m.id).filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const uniqueIds = new Set(ids);
    
    if (duplicateIds.length > 0) {
      console.error(`\n❌ ERROR: Found ${duplicateIds.length} duplicate ID(s) in JSON file:`);
      duplicateIds.forEach(id => {
        const members = teamMembers.filter(m => m.id === id);
        console.error(`   - ID "${id}" appears ${members.length} times:`);
        members.forEach((m, idx) => {
          console.error(`     ${idx + 1}. ${m.name || 'Unnamed'} (${m.role || 'No role'})`);
        });
      });
      console.error('\n⚠️  Please fix duplicate IDs before importing to prevent data corruption.');
      process.exit(1);
    }
    
    if (ids.length !== uniqueIds.size) {
      console.warn(`⚠️  Warning: ${ids.length} team members but only ${uniqueIds.size} unique IDs`);
    } else {
      console.log(`   ✅ All ${ids.length} team members have unique IDs`);
    }
    
    // Check for duplicate names (informational only)
    const names = teamMembers.map(m => m.name).filter(Boolean);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      const uniqueDuplicateNames = [...new Set(duplicateNames)];
      console.log(`   ℹ️  Found ${uniqueDuplicateNames.length} duplicate name(s): ${uniqueDuplicateNames.join(', ')}`);
      console.log(`      (This is OK if they are different people with different IDs)`);
    }
    
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

    // Check for ID conflicts between JSON and existing data
    const currentIds = new Set(currentTeamMembers.map(m => m.id).filter(Boolean));
    const jsonIds = new Set(ids);
    const conflictingIds = [...currentIds].filter(id => jsonIds.has(id));
    
    if (conflictingIds.length > 0) {
      console.log(`\n⚠️  Warning: ${conflictingIds.length} team member ID(s) already exist in Firestore:`);
      conflictingIds.forEach(id => {
        const currentMember = currentTeamMembers.find(m => m.id === id);
        const jsonMember = teamMembers.find(m => m.id === id);
        console.log(`   - ID "${id}":`);
        console.log(`     Current: ${currentMember?.name || 'Unnamed'} (${currentMember?.role || 'No role'})`);
        console.log(`     JSON:    ${jsonMember?.name || 'Unnamed'} (${jsonMember?.role || 'No role'})`);
      });
      console.log(`\n   These will be REPLACED with the JSON data.`);
    }

    // Show summary
    console.log(`\n📋 Import Summary:`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Current team members: ${currentTeamMembers.length}`);
    console.log(`   - New team members: ${teamMembers.length}`);
    console.log(`   - Change: ${teamMembers.length - currentTeamMembers.length > 0 ? '+' : ''}${teamMembers.length - currentTeamMembers.length}`);
    if (conflictingIds.length > 0) {
      console.log(`   - IDs to be replaced: ${conflictingIds.length}`);
    }

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

    // Final safety check: Remove any duplicates that might have slipped through
    console.log(`\n🔒 Final safety check: Removing any duplicate IDs...`);
    const seenIds = new Set();
    const deduplicatedTeamMembers = [];
    let duplicatesRemoved = 0;
    
    for (const member of teamMembers) {
      if (!member.id) {
        console.warn(`   ⚠️  Skipping team member without ID: ${member.name || 'Unnamed'}`);
        continue;
      }
      
      if (seenIds.has(member.id)) {
        console.warn(`   ⚠️  Removing duplicate ID "${member.id}": ${member.name || 'Unnamed'}`);
        duplicatesRemoved++;
        continue;
      }
      
      seenIds.add(member.id);
      deduplicatedTeamMembers.push(member);
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`   ✅ Removed ${duplicatesRemoved} duplicate(s)`);
    } else {
      console.log(`   ✅ No duplicates found`);
    }
    
    console.log(`   Final count: ${deduplicatedTeamMembers.length} unique team members`);

    // Update Firestore document
    console.log(`\n💾 Updating Firestore document...`);
    await userAccountRef.set(
      {
        teamMembers: deduplicatedTeamMembers,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`\n✅ Team members imported successfully!`);
    console.log(`\n📊 Final Summary:`);
    console.log(`   - Total team members imported: ${deduplicatedTeamMembers.length}`);
    if (deduplicatedTeamMembers.length > 0) {
      console.log(`   - Members with photos: ${deduplicatedTeamMembers.filter(m => m.pictureUrl && m.pictureUrl.trim()).length}`);
      console.log(`   - Members with roles: ${deduplicatedTeamMembers.filter(m => m.role).length}`);
      const uniqueRoles = [...new Set(deduplicatedTeamMembers.map(m => m.role).filter(Boolean))];
      if (uniqueRoles.length > 0) {
        console.log(`   - Unique roles: ${uniqueRoles.join(', ')}`);
      }
    }
    if (duplicatesRemoved > 0) {
      console.log(`   - Duplicates removed: ${duplicatesRemoved}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error importing team members:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importTeamMembers();
