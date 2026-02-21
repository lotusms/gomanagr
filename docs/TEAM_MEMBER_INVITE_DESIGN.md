# Team Member Invite – Where and How

## Recommendation: Support both (form + after add)

- **In the Add Team Member form:** Optional “Send invite to log in” when the user enters an **email**. If checked, on submit you create the team member and create an org invite (and send the email). One step when you want both.
- **After the team member exists:** For members who already have an email but no login, show an “Invite to log in” action (e.g. on the card or in the edit drawer). That way you can add people first and invite some later.

So: **trigger invite both from the Add form and after the member has been added.**

---

## Where to add the necessary fields

### 1. Add Team Member form (`AddTeamMemberForm.js`)

You already have **email** in the form. Add:

- **“Send invite to log in”** (or “Invite to GoManagr”) – checkbox, only enabled when `email` is present and valid.
- Optional: **“Invite after saving”** – same idea: “Send invite email after adding this member” so the flow is still “add then optionally invite” from the same screen.

No new “username” field: **Supabase Auth uses email as the identifier**. The “username” in the email can be the email itself, or “Your email is your username.”

### 2. Team member record (data model)

Store on each team member (in `user_profiles.team_members` JSON):

- **`email`** – already used in the form; keep storing it.
- **`invitedAt`** (optional) – ISO date when an invite was last sent.
- **`userId`** (optional) – Supabase Auth user id once they’ve signed up; set when they accept the invite so you can link “this card” to “this login.”

You don’t need a “temporary password” field on the team member; that’s handled in Auth and email (see below).

### 3. After the member has been added (Team page / PersonCard / Edit drawer)

- For members that have **email** but **no `userId`** (and optionally no `invitedAt` or invite expired): show an **“Invite to log in”** (or “Resend invite”) button.
- Call the same “create invite + send email” flow as in the form. Optionally update that member’s `invitedAt` (and later `userId` when they sign up).

So the “necessary fields” are: **email** (already there), **optional “Send invite” in the form**, and **optional `invitedAt` / `userId` on the member**. The rest is UI and backend flow.

---

## Flow: temporary password vs set‑your‑password link

Two common patterns:

1. **Magic link / set-password link (recommended)**  
   - Send an email with a link like: “Set your password: https://yourapp.com/signup?invite=TOKEN”.  
   - They open it, sign up with that email and choose their own password.  
   - No temporary password is sent over email (better security).  
   - Supabase’s **Invite user by email** (magic link) or your existing **org_invites** + custom “set password” page both support this.

2. **Temporary password**  
   - You create the Auth user with a random temp password and email it.  
   - They log in and are forced to change password.  
   - Possible but: you must create the user before they’ve “accepted,” and you’re sending a password in email (weaker security).

**Recommendation:** Use **no temporary password** in email. Use either:

- **Supabase `auth.admin.inviteUserByEmail()`** – Supabase sends the email with a link to set password, or  
- **Your own flow:** send an email with signup link `https://yourapp.com/signup?invite=<token>` (your existing `org_invites` token). They set their own password on signup. Optionally add a “Set password” link for already-created users if you ever create users server-side.

So: **username = email; no temp password in email; they set their own password** via signup or invite link.

---

## Where to trigger “create invite + send email”

- **From the Add Team form:** When “Send invite to log in” is checked and email is present, after (or as part of) saving the new team member, call your invite API and then send the email (see below).
- **From the Team page (after add):** When the user clicks “Invite to log in” (or “Resend invite”) on a member that has email but no `userId`, call the same invite API and send the email.

So the same backend flow is used in both places; only the trigger differs (form vs post-add action).

---

## What you need to implement

1. **Organization context on Team page**  
   Team page needs `organizationId` (and optionally current user id) to call create-invite. Options:  
   - Pass `organization` (or `organizationId`) from `DashboardLayout` into the Team page (e.g. via context or props), or  
   - Fetch organization on the Team page with `getUserOrganization(currentUser.uid)` (like DashboardLayout does).

2. **Create invite API**  
   You already have **`/api/create-invite`** (org_invites, returns `inviteLink`). Use it with `role: 'member'` for team member invites.

3. **Send email**  
   You do **not** currently send emails (no Resend/SendGrid, etc.). Options:  
   - **Supabase:** `auth.admin.inviteUserByEmail(email, { redirectTo: '...' })` – Supabase sends the email; then when they set password and sign in, you still need to create `user_profile` and `org_members` (e.g. in a callback or after first login).  
   - **Custom:** Keep using `org_invites` and add a small “send email” API that uses Resend/SendGrid/etc. to send a message like: “You’re invited to GoManagr. Set your password and sign in: [inviteLink].”  
   So: either wire Supabase invite emails into your org flow, or add one transactional email provider and an API that sends the invite link.

4. **Link team member to user after signup**  
   When an invited user completes signup (create-user-account-v2 with invite token):  
   - You already add them to `org_members` as `member`.  
   - Add logic (e.g. in create-user-account-v2 or in a “post signup” step) to find the **team member** in the org owner’s `user_profiles.team_members` by **email** and set that member’s **`userId`** to the new auth user id. That way the “card” and the “login” are the same person.

5. **Member view (non-admin)**  
   Access control is already role-based (`org_members.role`). Ensure dashboard/sidebar only shows admin-only items when `role === 'admin'` (or developer). Members get the same app but with a reduced menu and no invite/settings that only admins should see.

---

## Summary

- **Where to add fields:**  
  - **Add form:** Keep email; add “Send invite to log in” (and optionally “Invite after saving”).  
  - **Team member record:** `email` (existing), optional `invitedAt`, optional `userId`.  
  - **After add:** “Invite to log in” (and “Resend invite”) for members with email and no `userId`.

- **Trigger invite:** Both from the **Add Team Member form** and **after** the team member has been added, reusing the same invite + email flow.

- **Username / password:** Use **email as username**; **no temporary password in email**; they **set their own password** via signup or invite link. Member view is the same app with role-based (member) restrictions.

If you want, next step can be a short implementation checklist (file-by-file) for the form checkbox, “Invite to log in” button, and linking `userId` on signup.
