-- Seed: 10 client_messages for client CL-20260227-H84DQ4 in organization f55b3569-60f7-47a5-a79c-2464f0a28412
--
-- Run this in the Supabase SQL editor. user_id is taken from the first org member so RLS allows the rows.
-- Author: sent = team member (e.g. L. Silva); received = client name (Mark Peck).
-- Run migration 014_client_messages_rename_to_from_to_author.sql first if the table still has to_from.

INSERT INTO client_messages (
  client_id,
  user_id,
  organization_id,
  channel,
  direction,
  author,
  body,
  sent_at
) VALUES
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'sms',
  'sent',
  'L. Silva',
  'Hey I tried to reach out to you but I got your voice mail. Call us back when you get a chance. Thanks',
  '2026-02-28T14:40:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'sms',
  'received',
  'Mark Peck',
  'Sorry I missed your call. I''ll ring you back this afternoon.',
  '2026-02-28T15:22:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'chat',
  'sent',
  'L. Silva',
  'Quick reminder: our call is scheduled for tomorrow at 10am. Let me know if you need to reschedule.',
  '2026-02-27T09:00:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'chat',
  'received',
  'Mark Peck',
  '10am works. I''ll have the numbers ready for the review.',
  '2026-02-27T09:15:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'sms',
  'received',
  'Mark Peck',
  'Got the contract. Reviewing with legal and will get back to you by Friday.',
  '2026-02-26T11:30:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'sms',
  'sent',
  'L. Silva',
  'Thanks. No rush – whenever they''re done. We can schedule a short call if you have questions.',
  '2026-02-26T12:00:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'other',
  'sent',
  'L. Silva',
  'Left a voicemail about the Q1 deliverables. Please call when you have 10 minutes.',
  '2026-02-25T16:45:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'chat',
  'received',
  'Mark Peck',
  'Can we push the Tuesday meeting to Wednesday? Something came up on my side.',
  '2026-02-24T14:20:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'chat',
  'sent',
  'L. Silva',
  'Wednesday works. I''ll send a new invite for the same time.',
  '2026-02-24T14:35:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'sms',
  'received',
  'Mark Peck',
  'Thanks for the update. Talk then.',
  '2026-02-24T14:40:00Z'
);
