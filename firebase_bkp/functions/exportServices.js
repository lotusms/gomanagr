#!/usr/bin/env node

/**
 * Development utility: Export only services array from useraccount document.
 * 
 * Usage:
 *   node functions/exportServices.js <userId>
 *   node functions/exportServices.js <userId> <output-filename.json>
 * 
 * Example:
 *   node functions/exportServices.js i6beWdN28CQx14CYd9kuu18kF3p2
 *   node functions/exportServices.js i6beWdN28CQx14CYd9kuu18kF3p2 my-services.json
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

// Get command-line arguments
const args = process.argv.slice(2);
const userId = args[0];
const outputFilename = args[1];

if (!userId) {
  console.error('❌ Error: User ID is required');
  console.log('\nUsage:');
  console.log('  node functions/exportServices.js <userId> [output-filename.json]');
  console.log('\nExample:');
  console.log('  node functions/exportServices.js i6beWdN28CQx14CYd9kuu18kF3p2');
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

async function exportServices() {
  try {
    console.log(`\n📥 Fetching services for userId: ${userId}...`);
    
    const userAccountRef = db.collection('useraccount').doc(userId);
    const doc = await userAccountRef.get();
    
    if (!doc.exists) {
      console.error(`❌ No user account found for userId: ${userId}`);
      process.exit(1);
    }
    
    const userAccountData = doc.data();
    const services = userAccountData?.services || [];
    
    if (services.length === 0) {
      console.warn(`⚠️  No services found for userId: ${userId}`);
    }
    
    // Export only services array with metadata
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      documentId: doc.id,
      count: services.length,
      services: services,
    };
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `services-${userId}-${timestamp}.json`;
    const filename = outputFilename || defaultFilename;
    
    // Ensure filename ends with .json
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    // Write to file in functions folder
    const outputPath = join(__dirname, finalFilename);
    const jsonString = JSON.stringify(exportData, null, 2);
    writeFileSync(outputPath, jsonString, 'utf8');
    
    console.log(`\n✅ Services exported successfully!`);
    console.log(`📄 File: ${finalFilename}`);
    console.log(`📁 Path: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total services: ${services.length}`);
    if (services.length > 0) {
      const servicesWithDescription = services.filter(s => s.description && s.description.trim()).length;
      const totalAssignments = services.reduce((sum, s) => {
        return sum + (Array.isArray(s.assignedTeamMemberIds) ? s.assignedTeamMemberIds.length : 0);
      }, 0);
      console.log(`   - Services with descriptions: ${servicesWithDescription}`);
      console.log(`   - Total team member assignments: ${totalAssignments}`);
      const uniqueServiceNames = [...new Set(services.map(s => s.name).filter(Boolean))];
      console.log(`   - Unique service names: ${uniqueServiceNames.length}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error exporting services:', error.message);
    console.error(error);
    process.exit(1);
  }
}

exportServices();
