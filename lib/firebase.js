import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Uses environment variables from .env.local (preferred) or fallback values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyADqDuSxXXEJahlIwST9ahrqGB0vH9Mk3o",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gomanagr-845b4.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gomanagr-845b4",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gomanagr-845b4.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "663125262435",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:663125262435:web:55a380cea92e409e4d7856",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore - explicitly use default database
// If you get "Database '(default)' not found" error, you need to:
// 1. Go to Firebase Console -> Firestore Database
// 2. Click "Create database"
// 3. Choose "Start in production mode" or "Start in test mode"
// 4. Select a location for your database
let db;
try {
  db = getFirestore(app);
} catch (error) {
  console.error('Firestore initialization error:', error);
  throw new Error(
    'Firestore database not found. Please enable Firestore in Firebase Console: ' +
    'https://console.firebase.google.com/project/gomanagr-845b4/firestore'
  );
}

export const storage = getStorage(app);

export { db };
export default app;
