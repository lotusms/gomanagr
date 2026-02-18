# Firebase Backup Files

This folder contains Firebase-related files that were moved during the migration to Supabase. These files are kept as backups in case you need to reference them or migrate additional data.

## Files Moved

### Configuration Files (Root)
- `gomanagr-845b4-firebase-adminsdk-fbsvc-ad93840423.json` - Firebase Admin SDK service account key
- `firebase.json` - Firebase project configuration
- `firestore.rules` - Firestore security rules
- `storage.rules` - Firebase Storage security rules

### Client-Side Code
- `lib/firebase.js` - Firebase client initialization (replaced by `lib/supabase.js`)

### Server-Side Code
- `server/lib/firebaseAdmin.js` - Firebase Admin SDK initialization
- `server/services/userService.js` - Server-side Firebase user service

### API Routes
- `pages/api/check-email.js` - Email check API (still uses Firebase Admin)
  - **Note**: This API route needs to be updated to use Supabase Admin or removed if not needed

### Functions/Scripts
- `functions/exportUserAccountToJSON.js` - Export user account data
- `functions/exportUserAccount.js` - Export user account
- `functions/exportTeamMembers.js` - Export team members
- `functions/exportServices.js` - Export services
- `functions/importServices.js` - Import services
- `functions/importTeamMembers.js` - Import team members
- `functions/index.js` - Firebase Functions entry point

## Migration Status

✅ **Migrated to Supabase:**
- Authentication (`lib/AuthContext.js` now uses Supabase)
- Database (`services/userService.js` now uses Supabase)
- Storage (`services/userService.js` upload functions use Supabase Storage)

⚠️ **Still Needs Migration:**
- `pages/api/check-email.js` - Currently disabled (moved here). Update to use Supabase Admin or remove if not needed.

## Restoring Files

If you need to restore any of these files:

1. **For reference only**: Files are preserved here for documentation/reference
2. **For migration scripts**: The migration script (`scripts/migrate-firebase-to-supabase.js`) still uses Firebase Admin SDK, so you may need the service account key
3. **For API routes**: Copy `pages/api/check-email.js` back and update it to use Supabase Admin

## Important Notes

- **Service Account Key**: Keep `gomanagr-845b4-firebase-adminsdk-fbsvc-ad93840423.json` secure. It contains admin credentials.
- **Migration Scripts**: The migration script in `scripts/` still needs Firebase Admin SDK to read from Firestore
- **No Active Dependencies**: The main app no longer imports these files - they're safe to keep as backups
