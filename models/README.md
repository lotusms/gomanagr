# Models Directory

This directory contains data models and schemas for Firestore collections.

## UserAccount Model

**File**: `UserAccount.js`

**Collection**: `useraccount`

**Document ID**: Firebase Auth User ID (same as `userId` field)

### Purpose

This model documents the structure of user account documents created during the multi-step signup process. Each document contains:

- Authentication information (userId, email, trial status)
- Personal information (name, purpose, role)
- Company information (name, logo, size, locations)
- User preferences (sections to track)
- Referral information
- Timestamps

### Usage

```javascript
import { 
  UserAccountSchema, 
  ExampleUserAccount, 
  validateUserAccount 
} from '@/models/UserAccount';

// Validate data before saving
const validation = validateUserAccount(userData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Reference example structure
console.log('Example document:', ExampleUserAccount);
```

### Key Points

1. **Document ID = User ID**: The Firestore document ID matches the Firebase Auth user ID for easy lookup
2. **Optional Fields**: Fields like `companyLogo` are saved as empty strings if not provided
3. **Arrays**: `sectionsToTrack` is always an array (empty array if none selected)
4. **Timestamps**: Both `createdAt` and `updatedAt` are ISO 8601 strings

### Debugging Tips

When debugging user account issues:

1. Check the document ID matches the Firebase Auth user ID
2. Verify all required fields are present
3. Check enum values match expected options
4. Ensure `sectionsToTrack` is an array
5. Verify timestamps are valid ISO strings

### Example Queries

```javascript
// Get user account by auth ID
const userAccountRef = doc(db, 'useraccount', authUserId);
const userAccount = await getDoc(userAccountRef);

// Query users by role
const q = query(
  collection(db, 'useraccount'),
  where('role', '==', 'Owner')
);

// Query users on trial
const trialUsers = query(
  collection(db, 'useraccount'),
  where('trial', '==', true)
);
```
