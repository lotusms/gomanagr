# Firebase → Supabase migration

The app now uses **Supabase** for auth, database, and storage. Follow these steps to run it.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Settings → API**: copy **Project URL** and **anon public** key.

## 2. Environment variables

In `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Database schema

In the Supabase **SQL Editor**, run the migration:

- File: `supabase/migrations/001_user_account.sql`

This creates the `user_account` table and RLS policies so each user can only access their own row.

## 4. Storage buckets

In **Storage**, create two **public** buckets:

- `company-logos`
- `team-photos`

(Or use the same paths in your bucket policy if you prefer a single bucket.)

## 5. Auth

- **Sign up / Login** use Supabase Auth (email + password).
- **Password reset** uses Supabase’s `resetPasswordForEmail`; configure the redirect URL in Supabase Auth settings if needed.

## What was migrated

| Before (Firebase)     | After (Supabase)        |
|-----------------------|-------------------------|
| Firebase Auth         | Supabase Auth           |
| Firestore `useraccount` doc | Table `public.user_account` |
| Firebase Storage (logos, team photos) | Supabase Storage buckets |

## Optional: remove Firebase

- Client code no longer imports `@/lib/firebase`.
- You can keep or remove Firebase for:
  - `pages/api/check-email.js` (uses Firebase Admin; can be reimplemented with Supabase Admin if needed).
  - `server/services/userService.js` and other server scripts (migrate to Supabase server client or leave as-is).

## Data migration from Firebase

### Automated migration script

Use the provided script to migrate all user accounts:

```bash
# Add Supabase service_role key to .env.local (get from Supabase Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Dry run (preview changes without making them)
node scripts/migrate-firebase-to-supabase.js --dry-run

# Migrate all users
node scripts/migrate-firebase-to-supabase.js

# Migrate a single user
node scripts/migrate-firebase-to-supabase.js --user-id <firebase-uid>
```

**What the script does:**
1. ✅ Exports all `useraccount` documents from Firestore
2. ✅ Creates users in Supabase Auth (if they don't exist) with the same email
3. ✅ Transforms data: camelCase → snake_case, arrays → JSONB
4. ✅ Stores extra fields (organizationAddress, locations, etc.) in `profile` JSONB column
5. ✅ Upserts into `user_account` table with `id` = Supabase Auth UUID

**After migration:**
- Users will need to **reset their passwords** (use "Forgot Password" in the app)
- Passwords cannot be migrated for security reasons
- All other data (clients, team members, appointments, etc.) is preserved

### Troubleshooting: Empty data after migration

If you see the `user_account` row exists but all fields are null/empty:

1. **Debug what's in Firestore:**
   ```bash
   node scripts/debug-migration.js <firebase-user-id>
   ```
   This shows exactly what data exists in Firestore and how it would be transformed.

2. **Re-migrate with detailed logging:**
   ```bash
   node scripts/remigrate-user.js <firebase-user-id>
   ```
   This re-runs the migration for one user with step-by-step logging to see where data might be lost.

3. **Check Supabase row:**
   - Go to Supabase Dashboard > Table Editor > `user_account`
   - Find the row by email or UUID
   - Check if `profile` JSONB column has data (extra fields go there)

4. **Common issues:**
   - **Empty arrays**: If Firestore has `teamMembers: []`, Supabase will also have empty array (this is correct)
   - **Null vs empty string**: Some fields might be `null` instead of empty string (both are valid)
   - **Profile column**: Extra fields like `organizationAddress` go in `profile` JSONB, not top-level columns

### Manual migration (if needed)

If you prefer to migrate manually:

1. **Export Firestore data:**
   ```bash
   # Export a single user account
   node functions/exportUserAccountToJSON.js <firebase-uid>
   ```

2. **Create users in Supabase Auth:**
   - Go to Supabase Dashboard > Authentication > Users
   - Create users with the same email addresses
   - Note the new UUID for each user

3. **Transform and import:**
   - Map camelCase fields to snake_case columns
   - Set `id` = Supabase Auth UUID (not Firebase UID)
   - Store extra fields in `profile` JSONB
   - Insert/upsert into `user_account` table

### Storage migration (logos & photos)

**Company logos:**
- Firebase Storage: `company-logos/{firebase-uid}/logo.png`
- Supabase Storage: `company-logos/{supabase-uuid}/logo.png`
- Download from Firebase, upload to Supabase with new UUID path

**Team photos:**
- Firebase Storage: `team-photos/{firebase-uid}/{member-id}/photo.jpg`
- Supabase Storage: `team-photos/{supabase-uuid}/{member-id}/photo.jpg`
- Same process: download → re-upload with new UUID

**Note:** The migration script handles data migration but **not** storage files. You'll need to:
1. Download files from Firebase Storage
2. Re-upload to Supabase Storage with paths using the new Supabase UUIDs
3. Update `companyLogo` URLs and `teamMembers[].pictureUrl` in the database

### Field mapping reference

| Firebase (camelCase) | Supabase (snake_case) | Type |
|---------------------|----------------------|------|
| `userId` | `id` | UUID (FK to auth.users) |
| `email` | `email` | text |
| `firstName` | `first_name` | text |
| `lastName` | `last_name` | text |
| `companyName` | `company_name` | text |
| `companyLogo` | `company_logo` | text |
| `teamSize` | `team_size` | text |
| `companySize` | `company_size` | text |
| `companyLocations` | `company_locations` | text |
| `sectionsToTrack` | `sections_to_track` | jsonb |
| `referralSource` | `referral_source` | text |
| `selectedPalette` | `selected_palette` | text |
| `dismissedTodoIds` | `dismissed_todo_ids` | jsonb |
| `teamMembers` | `team_members` | jsonb |
| `clients` | `clients` | jsonb |
| `services` | `services` | jsonb |
| `appointments` | `appointments` | jsonb |
| `organizationAddress`, `locations`, etc. | `profile` | jsonb |
| `createdAt` | `created_at` | timestamptz |
| `updatedAt` | `updated_at` | timestamptz |
