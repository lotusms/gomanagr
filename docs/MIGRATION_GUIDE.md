# Multi-Tenant Organization Migration Guide

This guide outlines the migration from single-tenant to multi-tenant organization structure.

## Database Schema Changes

### New Tables:
1. **`user_profiles`** (renamed from `user_account`)
   - Stores user personal information only
   - No longer contains organization/company data

2. **`organizations`**
   - Stores organization/tenant data
   - Contains: name, logo, industry, company_size, etc.
   - Contains: teamMembers, clients, services, appointments (JSONB)

3. **`org_members`**
   - Join table linking users to organizations
   - Contains: `organization_id`, `user_id`, `role` (admin/developer/member)
   - Unique constraint on (organization_id, user_id)

## Migration Steps

### 1. Run Database Migration
```bash
# Execute the SQL migration file
psql -h your-host -U your-user -d your-database -f migrations/001_multi_tenant_schema.sql
```

### 2. Update Code References

#### Files to Update:

**Services:**
- ✅ `services/organizationService.js` - NEW (created)
- ⚠️ `services/userService.js` - Needs update to work with `user_profiles`
- ⚠️ `pages/api/create-user-account.js` - Replace with v2 or update

**Signup Flow:**
- ⚠️ `components/signup/MultiStepSignup.js` - Update to use new API
- ⚠️ `pages/api/create-user-account-v2.js` - NEW (created, needs testing)

**Components:**
- ⚠️ All components that reference `userAccount.companyName` → use `organization.name`
- ⚠️ All components that reference `userAccount.companyLogo` → use `organization.logo`
- ⚠️ Dashboard components need to fetch organization data

**Pages:**
- ⚠️ `pages/dashboard.js` - Update to fetch organization
- ⚠️ `pages/dashboard/settings.js` - Update organization settings
- ⚠️ `components/settings/OrganizationSettings.js` - Update to use organization

**Context/State:**
- ⚠️ Create `OrganizationContext` to manage current organization
- ⚠️ Update `UserAccountContext` to work with user_profiles only

## Signup Flow Changes

### Case A: Normal Signup (No Invite)
1. User signs up with email/password
2. Create Supabase Auth user
3. Create `user_profiles` row
4. Create `organizations` row (from company data)
5. Create `org_members` row (role: 'admin')

### Case B: Invited Signup
1. User clicks invite link with token
2. Create Supabase Auth user
3. Create `user_profiles` row
4. Validate invite token (get `organization_id` and `role`)
5. Create `org_members` row (role from invite)

## Data Migration Notes

The migration SQL includes a data migration script that:
- Creates an organization for each existing user
- Adds the user as admin of their organization
- Moves company data to the organization table

**Important:** Since you're wiping the database, you can skip the data migration part of the SQL.

## Key Changes in Code

### Before:
```javascript
const userAccount = await getUserAccount(userId);
const companyName = userAccount.companyName;
const teamMembers = userAccount.teamMembers;
```

### After:
```javascript
const userProfile = await getUserProfile(userId);
const organization = await getUserOrganization(userId);
const companyName = organization.name;
const teamMembers = organization.teamMembers; // Or fetch from org
```

### Organization Context Pattern:
```javascript
// Create OrganizationContext
const { currentOrganization, switchOrganization } = useOrganization();

// Components access organization data
const orgName = currentOrganization?.name;
const userRole = currentOrganization?.membership?.role;
```

## Next Steps

1. ✅ Run database migration
2. ⚠️ Update `userService.js` to work with `user_profiles`
3. ⚠️ Create `OrganizationContext` provider
4. ⚠️ Update signup flow to use new API
5. ⚠️ Update all components to use organization data
6. ⚠️ Test both signup flows (normal and invited)
7. ⚠️ Update RLS policies if needed

## Testing Checklist

- [ ] Normal signup creates user + org + membership
- [ ] Invited signup adds user to existing org
- [ ] User can access their organization data
- [ ] Organization settings can be updated
- [ ] Team members, clients, services work with organization
- [ ] Developer/admin role checks work correctly
