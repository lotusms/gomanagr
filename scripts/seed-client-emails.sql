-- Seed: 6 test client_emails for Supabase
--
-- 1. Get the correct client_id: open the client in the app (e.g. Edit Johnny Carson),
--    then copy the id from the URL: /dashboard/clients/<THIS_ID>/edit
-- 2. Replace every <client_id> below with that id, then run this whole file.
--
-- user_id is taken from the first row in user_profiles.
-- For org mode: replace NULL in organization_id with your org UUID, e.g. '...'::uuid.
--
-- If you already ran the seed and the new emails don't show in the Communication Log,
-- those rows likely have the wrong client_id. Run the UPDATE at the bottom of this file
-- (replace YOUR_CLIENT_ID with the id from the client's URL as above).

INSERT INTO client_emails (
  client_id,
  user_id,
  organization_id,
  subject,
  direction,
  to_from,
  body,
  attachments,
  sent_at,
  related_project_case,
  follow_up_date
) VALUES
(
  '<client_id>',
  (SELECT id FROM user_profiles LIMIT 1),
  NULL,
  'Re: Harrisburg Project timeline',
  'received',
  'project.manager@company.com',
  'Hi,

Thanks for sending over the timeline. We''ve reviewed the milestones and are aligned with the phased approach.

Could you confirm the kickoff date for Phase 2? We''d like to block internal resources accordingly.

Best regards',
  '[]'::jsonb,
  '2026-02-25T14:00:00Z',
  'Harrisburg Project',
  '2026-03-02'
),
(
  '<client_id>',
  (SELECT id FROM user_profiles LIMIT 1),
  NULL,
  'Contract draft – review requested',
  'sent',
  'legal@client.com',
  'Hi,

Please find attached the updated contract draft incorporating your feedback from our last call.

Let me know if you have any further changes or if we can proceed to signature.

Thanks',
  '["https://storage.example/bucket/123-contract-draft-v2.pdf"]'::jsonb,
  '2026-02-24T11:30:00Z',
  NULL,
  NULL
),
(
  '<client_id>',
  (SELECT id FROM user_profiles LIMIT 1),
  NULL,
  'Follow-up: IT Engineering roles',
  'sent',
  'mail@mail.com',
  'Hi John,

I hope you''re doing well. I wanted to follow up regarding the Director and Senior IT Engineering positions we discussed.

Attached are the updated job descriptions and resume samples we mentioned. Please let me know when you''d like to schedule a call to review.

Thank you,
L. Silva',
  '["https://storage.example/bucket/456-Director_IT_Engineering.pdf", "https://storage.example/bucket/789-Senior_IT_Engineering_Resume.pdf"]'::jsonb,
  '2026-02-26T18:29:00Z',
  NULL,
  '2026-03-01'
),
(
  '<client_id>',
  (SELECT id FROM user_profiles LIMIT 1),
  NULL,
  'Invoice #INV-2026-004',
  'sent',
  'ap@client.org',
  'Hello,

Please find attached invoice #INV-2026-004 for services rendered in February 2026.

Payment terms: Net 30. Let us know if you need a different format or have any questions.

Thank you.',
  '["https://storage.example/bucket/101-invoice-2026-004.pdf"]'::jsonb,
  '2026-02-23T09:15:00Z',
  NULL,
  NULL
),
(
  '<client_id>',
  (SELECT id FROM user_profiles LIMIT 1),
  NULL,
  'Meeting notes – Q1 planning',
  'received',
  'l.silva@yourcompany.com',
  'Hi,

Here are the meeting notes from our Q1 planning session. I''ve also attached the summary spreadsheet we walked through.

Key decisions:
- Launch date set for March 15
- Budget approved as discussed
- Next sync scheduled for next week

Cheers',
  '["https://storage.example/bucket/202-Q1-Planning-Notes.xlsx"]'::jsonb,
  '2026-02-22T16:45:00Z',
  'Harrisburg Project',
  '2026-02-28'
),
(
  '<client_id>',
  (SELECT id FROM user_profiles LIMIT 1),
  NULL,
  'Quick check-in',
  'received',
  'client.contact@example.com',
  'Hi,

Just checking in to see if there''s any update on the proposal. No rush – whenever you have a chance.

Thanks!',
  '[]'::jsonb,
  '2026-02-27T12:00:00Z',
  NULL,
  NULL
);

-- ---------------------------------------------------------------------------
-- Fix 1: Wrong client_id – if seeded rows don't show, set client_id to the
-- client you're viewing. Replace YOUR_CLIENT_ID with the id from the URL:
-- /dashboard/clients/YOUR_CLIENT_ID/edit
-- ---------------------------------------------------------------------------
-- UPDATE client_emails
-- SET client_id = 'CL-20260227-H84DQ4'
-- WHERE subject IN (
--   'Re: Harrisburg Project timeline',
--   'Contract draft – review requested',
--   'Follow-up: IT Engineering roles',
--   'Invoice #INV-2026-004',
--   'Meeting notes – Q1 planning',
--   'Quick check-in'
-- );

-- ---------------------------------------------------------------------------
-- Fix 2: Organization mode – if client_id is correct but emails still don't
-- show, you're likely in an org. The API only returns rows where
-- organization_id matches. Run this to copy organization_id and user_id from
-- an email that already shows for this client (replace YOUR_CLIENT_ID):
-- ---------------------------------------------------------------------------
-- UPDATE client_emails ce
-- SET
--   organization_id = ref.org_id,
--   user_id = ref.uid
-- FROM (
--   SELECT organization_id AS org_id, user_id AS uid
--   FROM client_emails
--   WHERE client_id = 'CL-20260227-H84DQ4' AND organization_id IS NOT NULL
--   LIMIT 1
-- ) ref
-- WHERE ce.client_id = 'CL-20260227-H84DQ4' AND ce.organization_id IS NULL;
