import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

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
      // First, delete all existing logos in the user's folder to ensure only one logo exists
      try {
        const userLogosFolderRef = ref(storage, `company-logos/${userId}`);
        const listResult = await listAll(userLogosFolderRef);
        
        // Delete all existing logo files
        const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
        await Promise.all(deletePromises);
      } catch (err) {
        // If folder doesn't exist or is empty, that's okay - just continue
        console.log('No existing logos to delete (or folder does not exist)');
      }

      // Upload the new logo
      const logoRef = ref(storage, `company-logos/${userId}/${logoFile.name}`);
      await uploadBytes(logoRef, logoFile);
      logoUrl = await getDownloadURL(logoRef);
    } else {
      // If no new logo file, preserve existing logo from Firestore if not provided in userData
      if (!logoUrl) {
        try {
          const userAccountRef = doc(db, 'useraccount', userId);
          const docSnap = await getDoc(userAccountRef);
          if (docSnap.exists()) {
            const existingData = docSnap.data();
            logoUrl = existingData.companyLogo || '';
          }
        } catch (err) {
          console.warn('Could not fetch existing logo:', err);
        }
      }
    }

    // Prepare document data - always include companyLogo
    const accountData = {
      ...userData,
      companyLogo: logoUrl,
      updatedAt: new Date().toISOString(),
    };

    // Use merge: true to preserve existing fields that aren't being updated
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(userAccountRef, accountData, { merge: true });

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

/**
 * Save appointments array to user account
 * @param {string} userId - The Firebase Auth user ID
 * @param {Array} appointments - Array of appointment objects
 * @returns {Promise<void>}
 */
export async function saveAppointments(userId, appointments) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(
      userAccountRef,
      {
        appointments: appointments,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving appointments:', error);
    throw new Error('Failed to save appointments: ' + error.message);
  }
}

/**
 * Add or update an appointment
 * @param {string} userId - The Firebase Auth user ID
 * @param {Object} appointment - Appointment object to add/update
 * @returns {Promise<void>}
 */
export async function saveAppointment(userId, appointment) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    const docSnap = await getDoc(userAccountRef);

    let appointments = [];
    if (docSnap.exists()) {
      appointments = docSnap.data().appointments || [];
    }

    // Remove existing appointment with same ID if updating
    const filteredAppointments = appointments.filter((apt) => apt.id !== appointment.id);
    
    // Add the new/updated appointment
    filteredAppointments.push(appointment);

    await setDoc(
      userAccountRef,
      {
        appointments: filteredAppointments,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving appointment:', error);
    throw new Error('Failed to save appointment: ' + error.message);
  }
}

/**
 * Delete an appointment
 * @param {string} userId - The Firebase Auth user ID
 * @param {string} appointmentId - ID of appointment to delete
 * @returns {Promise<void>}
 */
export async function deleteAppointment(userId, appointmentId) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    const docSnap = await getDoc(userAccountRef);

    if (!docSnap.exists()) {
      throw new Error('User account not found');
    }

    const appointments = docSnap.data().appointments || [];
    const filteredAppointments = appointments.filter((apt) => apt.id !== appointmentId);

    await setDoc(
      userAccountRef,
      {
        appointments: filteredAppointments,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw new Error('Failed to delete appointment: ' + error.message);
  }
}
