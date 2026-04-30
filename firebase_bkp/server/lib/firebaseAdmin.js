/**
 * Firebase Admin SDK initialization
 * Use this for server-side operations that require admin privileges
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';
import { join, isAbsolute } from 'path';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  let serviceAccount = null;
  
  // Option 1: Read from environment variable (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    }
  }
  
  // Option 2: Path from FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS
  const pathFromEnv =
    !serviceAccount &&
    (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (pathFromEnv) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const filePath = isAbsolute(raw) ? raw : join(process.cwd(), raw);
      const fileContent = readFileSync(filePath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to read service account file from path:', error);
    }
  }

  // Option 3: Gitignored local file (never commit real keys)
  if (!serviceAccount) {
    try {
      const localPath = join(process.cwd(), 'firebase_bkp', 'service-account.json');
      if (existsSync(localPath)) {
        serviceAccount = JSON.parse(readFileSync(localPath, 'utf8'));
      }
    } catch {
      // ignore
    }
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Try to use default credentials (for Google Cloud environments)
    // Or initialize with project ID from environment
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      if (projectId) {
        initializeApp({
          projectId: projectId,
        });
      } else {
        initializeApp();
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error.message);
      console.error(
        'Set FIREBASE_SERVICE_ACCOUNT_KEY, FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS, ' +
          'or add firebase_bkp/service-account.json (gitignored).'
      );
    }
  }
}

export const adminAuth = getAuth();
