/**
 * Firebase Admin SDK initialization
 * Use this for server-side operations that require admin privileges
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  let serviceAccount = null;
  
  // Option 1: Read from environment variable (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('✅ Loaded Firebase Admin SDK credentials from FIREBASE_SERVICE_ACCOUNT_KEY');
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    }
  }
  
  // Option 2: Read from file path in environment variable
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.startsWith('/')
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const fileContent = readFileSync(filePath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log('✅ Loaded Firebase Admin SDK credentials from FIREBASE_SERVICE_ACCOUNT_PATH');
    } catch (error) {
      console.error('Failed to read service account file from path:', error);
    }
  }
  
  // Option 3: Try default file name in root directory
  if (!serviceAccount) {
    try {
      const defaultPath = join(process.cwd(), 'gomanagr-845b4-firebase-adminsdk-fbsvc-ad93840423.json');
      const fileContent = readFileSync(defaultPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log('✅ Loaded Firebase Admin SDK credentials from default file');
    } catch (error) {
      // File doesn't exist or can't be read - that's okay, try other methods
    }
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    // Try to use default credentials (for Google Cloud environments)
    // Or initialize with project ID from environment
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      if (projectId) {
        initializeApp({
          projectId: projectId,
        });
        console.log('✅ Firebase Admin SDK initialized with project ID');
      } else {
        initializeApp();
        console.log('✅ Firebase Admin SDK initialized with default credentials');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error.message);
      console.error('Please ensure service account JSON file exists in root directory or set FIREBASE_SERVICE_ACCOUNT_KEY/FIREBASE_SERVICE_ACCOUNT_PATH');
    }
  }
}

export const adminAuth = getAuth();
