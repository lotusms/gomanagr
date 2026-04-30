#!/usr/bin/env node

/**
 * Development utility: Export user account data from Firestore to a JSON file.
 * 
 * Usage:
 *   node functions/exportUserAccountToJSON.js <userId>
 *   node functions/exportUserAccountToJSON.js <userId> <output-filename.json>
 * 
 * Example:
 *   node functions/exportUserAccountToJSON.js i6beWdN28CQx14CYd9kuu18kF3p2
 *   node functions/exportUserAccountToJSON.js i6beWdN28CQx14CYd9kuu18kF3p2 my-account.json
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { writeFileSync } = require('fs');
const { join } = require('path');
const { loadFirebaseServiceAccount } = require('../../scripts/lib/loadFirebaseServiceAccount');

const REPO_ROOT = join(__dirname, '../..');

// Get command-line arguments
const args = process.argv.slice(2);
const userId = args[0];
const outputFilename = args[1];

if (!userId) {
  console.error('❌ Error: User ID is required');
  console.log('\nUsage:');
  console.log('  node functions/exportUserAccountToJSON.js <userId> [output-filename.json]');
  console.log('\nExample:');
  console.log('  node functions/exportUserAccountToJSON.js i6beWdN28CQx14CYd9kuu18kF3p2');
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

async function exportUserAccount() {
  try {
    console.log(`\n📥 Fetching user account for userId: ${userId}...`);
    
    const userAccountRef = db.collection('useraccount').doc(userId);
    const doc = await userAccountRef.get();
    
    if (!doc.exists) {
      console.error(`❌ No user account found for userId: ${userId}`);
      process.exit(1);
    }
    
    const userAccountData = doc.data();
    
    // Add metadata
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      documentId: doc.id,
      ...userAccountData,
    };
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `useraccount-${userId}-${timestamp}.json`;
    const filename = outputFilename || defaultFilename;
    
    // Ensure filename ends with .json
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    // Write to file in functions folder
    const outputPath = join(__dirname, finalFilename);
    const jsonString = JSON.stringify(exportData, null, 2);
    writeFileSync(outputPath, jsonString, 'utf8');
    
    console.log(`\n✅ User account exported successfully!`);
    console.log(`📄 File: ${finalFilename}`);
    console.log(`📁 Path: ${outputPath}`);
    console.log(`\n📊 Data summary:`);
    console.log(`   - Team members: ${userAccountData?.teamMembers?.length || 0}`);
    console.log(`   - Clients: ${userAccountData?.clients?.length || 0}`);
    console.log(`   - Company logo: ${userAccountData?.companyLogo ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('\n❌ Error exporting user account:', error.message);
    console.error(error);
    process.exit(1);
  }
}

exportUserAccount();
