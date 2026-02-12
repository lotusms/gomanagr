import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/client/lib/firebase';

/**
 * Create a user account document in Firestore
 * @param {string} userId - The Firebase Auth user ID
 * @param {object} userData - User account data
 * @param {File|null} logoFile - Optional logo file to upload
 * @returns {Promise<void>}
 */
export async function createUserAccount(userId, userData, logoFile = null) {
  try {
    let logoUrl = userData.companyLogo || '';

    // Upload logo if provided
    if (logoFile) {
      const logoRef = ref(storage, `company-logos/${userId}/${logoFile.name}`);
      await uploadBytes(logoRef, logoFile);
      logoUrl = await getDownloadURL(logoRef);
    }

    // Prepare document data
    const accountData = {
      ...userData,
      companyLogo: logoUrl,
      updatedAt: new Date().toISOString(),
    };

    // Create document in useraccount collection with same ID as auth user
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(userAccountRef, accountData, { merge: false });

    return accountData;
  } catch (error) {
    console.error('Error creating user account:', error);
    throw new Error('Failed to create user account: ' + error.message);
  }
}

/**
 * Get user account data
 * @param {string} userId - The Firebase Auth user ID
 * @returns {Promise<object|null>}
 */
export async function getUserAccount(userId) {
  try {
    const { getDoc } = await import('firebase/firestore');
    const userAccountRef = doc(db, 'useraccount', userId);
    const docSnap = await getDoc(userAccountRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user account:', error);
    throw new Error('Failed to get user account: ' + error.message);
  }
}
