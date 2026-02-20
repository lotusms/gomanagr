# Database Migrations

## Migration 001: Multi-tenant Organization Structure

This migration refactors the database to support multi-tenancy with organizations.

### Changes:
1. Renames `user_account` table to `user_profiles`
2. Creates `organizations` table for tenant data
3. Creates `org_members` join table linking users to organizations with roles

### Running the Migration:

1. **Backup your database first!**
   ```sql
   -- Create backup
   pg_dump your_database > backup_before_migration.sql
   ```

2. **Run the migration:**
   - Option A: Via Supabase Dashboard SQL Editor
     - Copy contents of `001_multi_tenant_schema.sql`
     - Paste into SQL Editor
     - Execute
   
   - Option B: Via psql command line
     ```bash
     psql -h your-host -U your-user -d your-database -f migrations/001_multi_tenant_schema.sql
     ```

3. **Verify the migration:**
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_profiles', 'organizations', 'org_members');
   
   -- Check data was migrated
   SELECT COUNT(*) FROM organizations;
   SELECT COUNT(*) FROM org_members;
   ```

### Rollback (if needed):

If you need to rollback, you'll need to:
1. Drop the new tables: `org_members`, `organizations`
2. Rename `user_profiles` back to `user_account`
3. Restore from backup if data was lost

**Note:** This migration assumes you're wiping the database as mentioned. If you need to preserve data, modify the migration accordingly.
