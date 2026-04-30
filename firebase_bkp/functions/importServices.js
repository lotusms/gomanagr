#!/usr/bin/env node

/**
 * Development utility: Import services array from JSON file to Firestore useraccount document.
 * 
 * Usage:
 *   node functions/importServices.js <userId> <json-file-path>
 *   node functions/importServices.js i6beWdN28CQx14CYd9kuu18kF3p2 services-i6beWdN28CQx14CYd9kuu18kF3p2-2026-02-17T12-52-18.json
 * 
 * Example:
 *   node functions/importServices.js i6beWdN28CQx14CYd9kuu18kF3p2 services-i6beWdN28CQx14CYd9kuu18kF3p2-2026-02-17T12-52-18.json
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
  console.log('  node functions/importServices.js <userId> <json-file-path>');
  console.log('\nExample:');
  console.log('  node functions/importServices.js i6beWdN28CQx14CYd9kuu18kF3p2 services-i6beWdN28CQx14CYd9kuu18kF3p2-2026-02-17T12-52-18.json');
  process.exit(1);
}

if (!jsonFilePath) {
  console.error('❌ Error: JSON file path is required');
  console.log('\nUsage:');
  console.log('  node functions/importServices.js <userId> <json-file-path>');
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

async function importServices() {
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

    // Extract services array
    const services = jsonData.services || jsonData.services || [];
    
    if (!Array.isArray(services)) {
      console.error('❌ Error: services must be an array');
      process.exit(1);
    }

    if (services.length === 0) {
      console.warn('⚠️  Warning: services array is empty');
      const response = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        readline.question('Do you want to continue and clear all services? (yes/no): ', (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
      });
      
      if (!response) {
        console.log('❌ Import cancelled');
        process.exit(0);
      }
    }

    console.log(`\n📊 Found ${services.length} services in JSON file`);
    
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
    const currentServices = currentData?.services || [];
    console.log(`   Current services in Firestore: ${currentServices.length}`);

    // Check for duplicates in JSON file
    console.log(`\n🔍 Checking for duplicates in JSON file...`);
    const ids = services.map(s => s.id).filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const uniqueIds = new Set(ids);
    
    if (duplicateIds.length > 0) {
      console.error(`\n❌ ERROR: Found ${duplicateIds.length} duplicate ID(s) in JSON file:`);
      duplicateIds.forEach(id => {
        const serviceItems = services.filter(s => s.id === id);
        console.error(`   - ID "${id}" appears ${serviceItems.length} times:`);
        serviceItems.forEach((s, idx) => {
          console.error(`     ${idx + 1}. ${s.name || 'Unnamed'} (${s.description || 'No description'})`);
        });
      });
      console.error('\n⚠️  Please fix duplicate IDs before importing to prevent data corruption.');
      process.exit(1);
    }
    
    if (ids.length !== uniqueIds.size) {
      console.warn(`⚠️  Warning: ${ids.length} services but only ${uniqueIds.size} unique IDs`);
    } else {
      console.log(`   ✅ All ${ids.length} services have unique IDs`);
    }

    // Check for ID conflicts between JSON and existing data
    const currentIds = new Set(currentServices.map(s => s.id).filter(Boolean));
    const jsonIds = new Set(ids);
    const conflictingIds = [...currentIds].filter(id => jsonIds.has(id));
    const newIds = [...jsonIds].filter(id => !currentIds.has(id));
    const existingIdsNotInJson = [...currentIds].filter(id => !jsonIds.has(id));
    
    if (conflictingIds.length > 0) {
      console.log(`\n⚠️  Warning: ${conflictingIds.length} service ID(s) already exist in Firestore:`);
      conflictingIds.forEach(id => {
        const currentService = currentServices.find(s => s.id === id);
        const jsonService = services.find(s => s.id === id);
        console.log(`   - ID "${id}":`);
        console.log(`     Current: ${currentService?.name || 'Unnamed'} (${currentService?.description || 'No description'})`);
        console.log(`     JSON:    ${jsonService?.name || 'Unnamed'} (${jsonService?.description || 'No description'})`);
      });
      console.log(`\n   These will be UPDATED with the JSON data.`);
    }
    
    if (newIds.length > 0) {
      console.log(`\n✅ ${newIds.length} new service(s) will be ADDED:`);
      newIds.slice(0, 10).forEach(id => {
        const jsonService = services.find(s => s.id === id);
        console.log(`   - ${jsonService?.name || 'Unnamed'} (ID: ${id})`);
      });
      if (newIds.length > 10) {
        console.log(`   ... and ${newIds.length - 10} more`);
      }
    }
    
    if (existingIdsNotInJson.length > 0) {
      console.log(`\nℹ️  ${existingIdsNotInJson.length} existing service(s) will be KEPT (not in JSON):`);
      existingIdsNotInJson.slice(0, 10).forEach(id => {
        const currentService = currentServices.find(s => s.id === id);
        console.log(`   - ${currentService?.name || 'Unnamed'} (ID: ${id})`);
      });
      if (existingIdsNotInJson.length > 10) {
        console.log(`   ... and ${existingIdsNotInJson.length - 10} more`);
      }
    }

    // Show summary
    console.log(`\n📋 Import Summary:`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Current services in Firestore: ${currentServices.length}`);
    console.log(`   - Services in JSON file: ${services.length}`);
    console.log(`   - Services to UPDATE: ${conflictingIds.length}`);
    console.log(`   - Services to ADD: ${newIds.length}`);
    console.log(`   - Services to KEEP: ${existingIdsNotInJson.length}`);
    const finalCount = existingIdsNotInJson.length + services.length;
    console.log(`   - Final count after merge: ${finalCount}`);

    // Confirm before proceeding
    console.log(`\n⚠️  This will MERGE/UPDATE services in Firestore (existing services will be updated, new ones added, others kept).`);
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
    console.log(`\n🔒 Final safety check: Removing any duplicate IDs from JSON...`);
    const seenIds = new Set();
    const deduplicatedJsonServices = [];
    let duplicatesRemoved = 0;
    
    for (const service of services) {
      if (!service.id) {
        console.warn(`   ⚠️  Skipping service without ID: ${service.name || 'Unnamed'}`);
        continue;
      }
      
      if (seenIds.has(service.id)) {
        console.warn(`   ⚠️  Removing duplicate ID "${service.id}": ${service.name || 'Unnamed'}`);
        duplicatesRemoved++;
        continue;
      }
      
      seenIds.add(service.id);
      deduplicatedJsonServices.push(service);
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`   ✅ Removed ${duplicatesRemoved} duplicate(s) from JSON`);
    } else {
      console.log(`   ✅ No duplicates found in JSON`);
    }
    
    console.log(`   JSON services after deduplication: ${deduplicatedJsonServices.length}`);

    // Merge services: Update existing, add new, keep others
    console.log(`\n🔄 Merging services...`);
    const mergedServicesMap = new Map();
    
    // First, add all existing services (to keep ones not in JSON)
    currentServices.forEach(service => {
      if (service.id) {
        mergedServicesMap.set(service.id, { ...service });
      }
    });
    
    // Then, update/add services from JSON
    let updatedCount = 0;
    let addedCount = 0;
    deduplicatedJsonServices.forEach(jsonService => {
      if (!jsonService.id) {
        return;
      }
      
      if (mergedServicesMap.has(jsonService.id)) {
        // Update existing service
        mergedServicesMap.set(jsonService.id, { ...jsonService });
        updatedCount++;
      } else {
        // Add new service
        mergedServicesMap.set(jsonService.id, { ...jsonService });
        addedCount++;
      }
    });
    
    // Convert map to array
    const mergedServices = Array.from(mergedServicesMap.values());
    
    console.log(`   ✅ Merged ${mergedServices.length} services:`);
    console.log(`      - Updated: ${updatedCount}`);
    console.log(`      - Added: ${addedCount}`);
    console.log(`      - Kept (unchanged): ${mergedServices.length - updatedCount - addedCount}`);

    // Update Firestore document
    console.log(`\n💾 Updating Firestore document...`);
    await userAccountRef.set(
      {
        services: mergedServices,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`\n✅ Services imported successfully!`);
    console.log(`\n📊 Final Summary:`);
    console.log(`   - Total services in Firestore: ${mergedServices.length}`);
    console.log(`   - Services updated: ${updatedCount}`);
    console.log(`   - Services added: ${addedCount}`);
    console.log(`   - Services kept (unchanged): ${mergedServices.length - updatedCount - addedCount}`);
    if (mergedServices.length > 0) {
      const servicesWithDescription = mergedServices.filter(s => s.description && s.description.trim()).length;
      const totalAssignments = mergedServices.reduce((sum, s) => {
        return sum + (Array.isArray(s.assignedTeamMemberIds) ? s.assignedTeamMemberIds.length : 0);
      }, 0);
      console.log(`   - Services with descriptions: ${servicesWithDescription}`);
      console.log(`   - Total team member assignments: ${totalAssignments}`);
      const uniqueServiceNames = [...new Set(mergedServices.map(s => s.name).filter(Boolean))];
      console.log(`   - Unique service names: ${uniqueServiceNames.length}`);
    }
    if (duplicatesRemoved > 0) {
      console.log(`   - Duplicates removed from JSON: ${duplicatesRemoved}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error importing services:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importServices();
