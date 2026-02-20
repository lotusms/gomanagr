# Multi-Tenant Setup Checklist

## ✅ Completed Steps

1. ✅ Database migration SQL created (`migrations/001_multi_tenant_schema.sql`)
2. ✅ Organization service created (`services/organizationService.js`)
3. ✅ Invite service created (`services/inviteService.js`)
4. ✅ New signup API created (`pages/api/create-user-account-v2.js`)
5. ✅ Invite API created (`pages/api/create-invite.js`)
6. ✅ Signup flow updated to handle invite tokens
7. ✅ RLS policies updated for security

## ⚠️ Required Actions Before Testing

### 1. Run Additional Migration
You need to run the `org_invites` table migration:

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/002_org_invites_table.sql
```

### 2. Update RLS Policies
The migration `001_multi_tenant_schema.sql` has been updated with stricter policies. You may need to re-run the RLS policy section if you already ran the migration:

```sql
-- Re-run these policies from 001_multi_tenant_schema.sql (lines 106-143)
-- This ensures users can't create orgs or add themselves directly
```

### 3. Verify API Endpoint Name
Make sure the API endpoint matches:
- ✅ `userService.js` calls `/api/create-user-account-v2`
- ✅ File exists: `pages/api/create-user-account-v2.js`

## Testing Checklist

### Test Case A: Normal Signup (No Invite)
- [ ] User signs up with email/password
- [ ] User completes all signup steps
- [ ] **Expected Result:**
  - ✅ User profile created in `user_profiles`
  - ✅ Organization created in `organizations`
  - ✅ User added to `org_members` with role='admin'
  - ✅ User can log in and access dashboard
  - ✅ User sees their organization data

### Test Case B: Invited Signup
- [ ] Admin creates invite via API or UI
- [ ] User receives invite link: `/signup?invite=TOKEN`
- [ ] User signs up using invite link
- [ ] **Expected Result:**
  - ✅ User profile created in `user_profiles`
  - ✅ NO new organization created
  - ✅ User added to existing organization in `org_members` with role='member' (or specified role)
  - ✅ Invite marked as used in `org_invites`
  - ✅ User can log in and access ONLY the invited organization
  - ✅ User has 'member' role (not admin)

### Security Tests
- [ ] User cannot create organization directly (blocked by RLS)
- [ ] User cannot add themselves to organization (blocked by RLS)
- [ ] User can only see organizations they're members of
- [ ] User can only see org members of their organizations
- [ ] Only admins/developers can create invites
- [ ] Only admins/developers can manage org members

## Current Status

### What's Ready:
1. ✅ Database schema (after running migrations)
2. ✅ Signup API handles both cases
3. ✅ Invite system structure
4. ✅ RLS policies for security

### What Needs Testing:
1. ⚠️ Run `002_org_invites_table.sql` migration
2. ⚠️ Test normal signup flow
3. ⚠️ Test invited signup flow
4. ⚠️ Verify RLS policies work correctly
5. ⚠️ Test that users can't join orgs without invite

### What Still Needs Implementation:
1. ⚠️ UI for admins to create invites (team management page)
2. ⚠️ Organization context/provider to manage current org
3. ⚠️ Update components to use organization data instead of userAccount.companyName
4. ⚠️ Organization switching UI (if users can belong to multiple orgs)

## Quick Test Commands

### Create an Invite (via API):
```bash
curl -X POST http://localhost:3000/api/create-invite \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORG_UUID",
    "email": "newuser@example.com",
    "role": "member",
    "invitedByUserId": "ADMIN_USER_UUID"
  }'
```

### Check User's Organizations:
```sql
SELECT o.*, om.role 
FROM organizations o
JOIN org_members om ON o.id = om.organization_id
WHERE om.user_id = 'USER_UUID';
```
