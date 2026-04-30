#!/usr/bin/env node

/**
 * Development utility: Export only teamMembers array from useraccount document.
 * 
 * Usage:
 *   node functions/exportTeamMembers.js <userId>
 *   node functions/exportTeamMembers.js <userId> <output-filename.json>
 * 
 * Example:
 *   node functions/exportTeamMembers.js i6beWdN28CQx14CYd9kuu18kF3p2
 *   node functions/exportTeamMembers.js i6beWdN28CQx14CYd9kuu18kF3p2 my-team.json
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
  console.log('  node functions/exportTeamMembers.js <userId> [output-filename.json]');
  console.log('\nExample:');
  console.log('  node functions/exportTeamMembers.js i6beWdN28CQx14CYd9kuu18kF3p2');
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

async function exportTeamMembers() {
  try {
    console.log(`\n📥 Fetching team members for userId: ${userId}...`);
    
    const userAccountRef = db.collection('useraccount').doc(userId);
    const doc = await userAccountRef.get();
    
    if (!doc.exists) {
      console.error(`❌ No user account found for userId: ${userId}`);
      process.exit(1);
    }
    
    const userAccountData = doc.data();
    const teamMembers = userAccountData?.teamMembers || [];
    
    if (teamMembers.length === 0) {
      console.warn(`⚠️  No team members found for userId: ${userId}`);
    }
    
    // Export only teamMembers array with metadata
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      documentId: doc.id,
      count: teamMembers.length,
      teamMembers: teamMembers,
    };
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `teamMembers-${userId}-${timestamp}.json`;
    const filename = outputFilename || defaultFilename;
    
    // Ensure filename ends with .json
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    // Write to file in functions folder
    const outputPath = join(__dirname, finalFilename);
    const jsonString = JSON.stringify(exportData, null, 2);
    writeFileSync(outputPath, jsonString, 'utf8');
    
    console.log(`\n✅ Team members exported successfully!`);
    console.log(`📄 File: ${finalFilename}`);
    console.log(`📁 Path: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total team members: ${teamMembers.length}`);
    if (teamMembers.length > 0) {
      console.log(`   - Members with photos: ${teamMembers.filter(m => m.pictureUrl).length}`);
      console.log(`   - Members with roles: ${teamMembers.filter(m => m.role).length}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error exporting team members:', error.message);
    console.error(error);
    process.exit(1);
  }
}

exportTeamMembers();
