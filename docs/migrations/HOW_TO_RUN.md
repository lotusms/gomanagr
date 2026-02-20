# How to Run the Migration

## Option 1: Supabase Dashboard (Easiest) ⭐ Recommended

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste Migration**
   - Open `migrations/001_multi_tenant_schema.sql` in your editor
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Cmd+Enter / Ctrl+Enter)
   - Wait for it to complete

5. **Verify Success**
   - You should see "Success. No rows returned"
   - Check that tables were created:
     ```sql
     SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('user_profiles', 'organizations', 'org_members');
     ```

---

## Option 2: Command Line (psql)

### Prerequisites
- PostgreSQL client (`psql`) installed
- Supabase connection details

### Get Supabase Connection Details

1. **Go to Supabase Dashboard**
   - Project Settings → Database

2. **Find Connection String**
   - Look for "Connection string" section
   - Copy the "URI" format (starts with `postgresql://`)
   - OR get individual values:
     - **Host**: `db.xxxxx.supabase.co`
     - **Database name**: Usually `postgres`
     - **Port**: Usually `5432`
     - **User**: Usually `postgres`
     - **Password**: Your database password

### Run Migration

**Method A: Using the helper script**
```bash
cd /Volumes/BackUp-Files/LotusMS/GoManagr/gomanagr
./migrations/run-migration.sh
```

**Method B: Direct psql command**
```bash
# Using connection string
psql "postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  -f migrations/001_multi_tenant_schema.sql

# Or using individual parameters
psql -h db.xxxxx.supabase.co \
     -U postgres \
     -d postgres \
     -p 5432 \
     -f migrations/001_multi_tenant_schema.sql
```

**Method C: Using environment variable**
```bash
# Set connection string
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"

# Run migration
psql "$DATABASE_URL" -f migrations/001_multi_tenant_schema.sql
```

---

## Option 3: Using Supabase CLI (if installed)

```bash
# Install Supabase CLI first (if not installed)
# npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

---

## Troubleshooting

### "psql: command not found"
- Install PostgreSQL client:
  - **macOS**: `brew install postgresql`
  - **Ubuntu/Debian**: `sudo apt-get install postgresql-client`
  - **Windows**: Download from https://www.postgresql.org/download/

### "Connection refused" or "Authentication failed"
- Double-check your connection details
- Make sure your IP is allowed in Supabase Dashboard → Settings → Database → Connection Pooling
- Try using the "Connection string" from Supabase Dashboard directly

### "Permission denied" or "Access denied"
- Make sure you're using the correct database password
- Check that your user has CREATE TABLE permissions
- If using RLS, you may need to use the service role key

### Migration fails partway through
- Check the error message
- If tables already exist, you may need to drop them first:
  ```sql
  DROP TABLE IF EXISTS org_members CASCADE;
  DROP TABLE IF EXISTS organizations CASCADE;
  -- Then rename user_account back if needed
  ALTER TABLE IF EXISTS user_profiles RENAME TO user_account;
  ```
- Then re-run the migration

---

## Important Notes

⚠️ **Before running:**
- Make sure you've backed up your database (if you have data)
- Since you mentioned wiping the database, you can skip the data migration part if needed

⚠️ **After running:**
- Verify tables were created correctly
- Check that RLS policies are enabled
- Test that you can query the new tables

---

## Quick Verification Queries

After running the migration, verify it worked:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'organizations', 'org_members');

-- Check table structures
\d user_profiles
\d organizations
\d org_members

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'organizations', 'org_members');
```
