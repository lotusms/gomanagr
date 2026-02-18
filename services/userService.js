import { doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

/**
 * Create a user account document in Firestore
 * 
 * Collection: useraccount
 * Document ID: userId (same as Firebase Auth user ID)
 * 
 * For the complete document structure and schema, see: @/models/UserAccount
 * 
 * @param {string} userId - The Firebase Auth user ID (also used as document ID)
 * @param {object} userData - User account data matching UserAccount schema
 * @param {File|null} logoFile - Optional logo file to upload to Firebase Storage
 * @returns {Promise<object>} The created account data
 */
export async function createUserAccount(userId, userData, logoFile = null) {
  try {
    let logoUrl = userData.companyLogo || '';

    // Upload logo if provided
    if (logoFile) {
      try {
        const logoRef = ref(storage, `company-logos/${userId}/${logoFile.name}`);
        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      } catch (storageError) {
        console.error('Logo upload error (continuing without logo):', storageError);
        // Continue without logo if upload fails
      }
    } else {
      // If no new logo file, preserve existing logo from Firestore if not provided in userData
      // This prevents overwriting the logo URL with an empty string
      if (!logoUrl || logoUrl.trim() === '') {
        try {
          const userAccountRef = doc(db, 'useraccount', userId);
          const existingDoc = await getDoc(userAccountRef);
          if (existingDoc.exists()) {
            const existingData = existingDoc.data();
            const existingLogo = existingData?.companyLogo;
            if (existingLogo && typeof existingLogo === 'string' && existingLogo.trim()) {
              logoUrl = existingLogo.trim();
            }
          }
        } catch (err) {
          console.warn('Could not fetch existing logo:', err);
        }
      }
    }

    // Prepare document data
    const accountData = {
      ...userData,
      companyLogo: logoUrl,
      updatedAt: new Date().toISOString(),
    };

    // Set createdAt - will be preserved if document already exists (via merge)
    if (!accountData.createdAt) {
      accountData.createdAt = new Date().toISOString();
    }

    const userAccountRef = doc(db, 'useraccount', userId);
    
    try {
      // Try to check if document exists first
      let documentExists = false;
      try {
        const existingDoc = await getDoc(userAccountRef);
        documentExists = existingDoc.exists();
        
        // If document exists, preserve the original createdAt
        if (documentExists) {
          const existingData = existingDoc.data();
          if (existingData?.createdAt) {
            accountData.createdAt = existingData.createdAt;
          }
        }
      } catch (checkError) {
        // If check fails, just proceed with creation
        // The setDoc call will create the collection automatically if it doesn't exist
        // We'll only throw an error if setDoc itself fails
        console.warn('Could not check if document exists, proceeding with create/update:', checkError.message);
      }

      // Use merge: true to create if doesn't exist, or update if it does
      // This ensures the collection is created automatically on first write
      await setDoc(userAccountRef, accountData, { merge: true });

      console.log(`✅ User account ${documentExists ? 'updated' : 'created'} successfully for user: ${userId}`);
      return accountData;
    } catch (firestoreError) {
      // Check for specific Firestore errors
      const errorMessage = firestoreError.message || '';
      const errorCode = firestoreError.code || '';
      
      if (
        errorMessage.includes('not found') || 
        errorMessage.includes('offline') ||
        errorCode === 'not-found' ||
        errorCode === 'unavailable'
      ) {
        throw new Error(
          'Firestore database not enabled or unavailable. Please enable Firestore in Firebase Console:\n\n' +
          '1. Go to: https://console.firebase.google.com/project/gomanagr-845b4/firestore\n' +
          '2. Click "Create database"\n' +
          '3. Choose "Start in production mode" (to use your security rules) or "Start in test mode"\n' +
          '4. Select a location (e.g., us-central1) and click "Enable"\n\n' +
          'After enabling, refresh this page and try again.'
        );
      }
      throw firestoreError;
    }
  } catch (error) {
    console.error('Error creating/updating user account:', error);
    throw new Error('Failed to create user account: ' + error.message);
  }
}

/**
 * Get user account data (may use cache).
 * @param {string} userId - The Firebase Auth user ID
 * @returns {Promise<object|null>}
 */
export async function getUserAccount(userId) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    const docSnap = await getDoc(userAccountRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    // Handle offline errors gracefully
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    if (
      errorMessage.includes('offline') ||
      errorCode === 'unavailable' ||
      errorCode === 'failed-precondition'
    ) {
      console.warn('Client is offline, returning null. Data will sync when connection is restored.');
      return null;
    }
    
    console.error('Error getting user account:', error);
    throw new Error('Failed to get user account: ' + error.message);
  }
}

/**
 * Get user account data from server (bypasses cache). Use after saving so the UI sees the latest data.
 * @param {string} userId - The Firebase Auth user ID
 * @returns {Promise<object|null>}
 */
export async function getUserAccountFromServer(userId) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    const docSnap = await getDocFromServer(userAccountRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user account from server:', error);
    return getUserAccount(userId);
  }
}

/**
 * Update the user's selected theme palette (persists across devices).
 * @param {string} userId - The Firebase Auth user ID
 * @param {string} paletteId - Theme palette ID (e.g. 'palette1', 'palette2')
 * @returns {Promise<void>}
 */
export async function updateUserTheme(userId, paletteId) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(
      userAccountRef,
      {
        selectedPalette: paletteId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating user theme:', error);
    throw new Error('Failed to save theme preference: ' + error.message);
  }
}

/**
 * Update the user's dismissed dashboard todo IDs (manual or after completion).
 * Persisted so todos stay hidden across sessions. Completed todos (e.g. after a tour)
 * can be added here to auto-dismiss.
 *
 * @param {string} userId - The Firebase Auth user ID
 * @param {string[]} dismissedTodoIds - Full list of todo IDs to treat as dismissed
 * @returns {Promise<void>}
 */
export async function updateDismissedTodos(userId, dismissedTodoIds) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(
      userAccountRef,
      {
        dismissedTodoIds: Array.isArray(dismissedTodoIds) ? dismissedTodoIds : [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating dismissed todos:', error);
    throw new Error('Failed to save dismissed todos: ' + error.message);
  }
}

/**
 * Update the user's team members (synced with Team page and Today's Appointments staff).
 * @param {string} userId - The Firebase Auth user ID
 * @param {Array<{ id: string, name: string, role?: string }>} teamMembers
 * @returns {Promise<void>}
 */
export async function updateTeamMembers(userId, teamMembers) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(
      userAccountRef,
      {
        teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating team members:', error);
    throw new Error('Failed to save team members: ' + error.message);
  }
}

/**
 * Update the user's clients (synced with Clients page).
 * @param {string} userId - The Firebase Auth user ID
 * @param {Array} clients - Array of client objects (id, name, phone?, email?, company?, companyPhone?, companyAddress?, companyEmail?)
 * @returns {Promise<void>}
 */
function cleanClientForFirestore(client) {
  // Recursively remove undefined, null, and empty string values
  const cleanValue = (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    if (Array.isArray(value)) {
      const cleaned = value.filter((item) => item !== undefined && item !== null && item !== '');
      return cleaned.length > 0 ? cleaned : undefined;
    }
    if (typeof value === 'object' && value !== null) {
      const cleaned = {};
      let hasValues = false;
      for (const [key, val] of Object.entries(value)) {
        const cleanedVal = cleanValue(val);
        if (cleanedVal !== undefined) {
          cleaned[key] = cleanedVal;
          hasValues = true;
        }
      }
      return hasValues ? cleaned : undefined;
    }
    return value;
  };
  
  const cleaned = {};
  for (const [key, value] of Object.entries(client)) {
    const cleanedVal = cleanValue(value);
    if (cleanedVal !== undefined) {
      cleaned[key] = cleanedVal;
    }
  }
  
  // Ensure id and name are always present
  if (!cleaned.id && client.id) cleaned.id = client.id;
  if (!cleaned.name && client.name) cleaned.name = client.name;
  
  return cleaned;
}

export async function updateClients(userId, clients) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    const cleanedClients = Array.isArray(clients) ? clients.map(cleanClientForFirestore) : [];
    
    await setDoc(
      userAccountRef,
      {
        clients: cleanedClients,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating clients:', error);
    throw new Error('Failed to save clients: ' + error.message);
  }
}

/**
 * Update the user's services (synced with Services page).
 * @param {string} userId - The Firebase Auth user ID
 * @param {Array<{ id: string, name: string, description?: string, assignedTeamMemberIds: string[] }>} services
 * @returns {Promise<void>}
 */
export async function updateServices(userId, services) {
  try {
    const userAccountRef = doc(db, 'useraccount', userId);
    await setDoc(
      userAccountRef,
      {
        services: Array.isArray(services) ? services : [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating services:', error);
    throw new Error('Failed to save services: ' + error.message);
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
