-- Seed: 5 client_internal_notes for client CL-20260227-H84DQ4 in organization f55b3569-60f7-47a5-a79c-2464f0a28412
--
-- Run this in the Supabase SQL editor. user_id is taken from the first org member so RLS allows the rows.
-- Run migration 013_client_internal_notes.sql first.

INSERT INTO client_internal_notes (
  client_id,
  user_id,
  organization_id,
  content,
  tag,
  is_pinned
) VALUES
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'This client''s payment is late',
  'billing',
  TRUE
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'Prefers email over phone for updates. Send summary after each call.',
  'preference',
  TRUE
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'Follow up on signed SOW by Friday.',
  'reminder',
  FALSE
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'Raised concern about scope creep on Phase 2. Document any change requests before committing.',
  'warning',
  FALSE
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'Staging access was failing for their QA lead—escalated to support. Ticket #2847.',
  'issue',
  TRUE
);
