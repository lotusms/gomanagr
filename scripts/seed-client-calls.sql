-- Seed: 5 client_calls for client CL-20260227-H84DQ4 in organization f55b3569-60f7-47a5-a79c-2464f0a28412
--
-- Run this in the Supabase SQL editor. user_id is taken from the first org member so RLS allows the rows.
-- Run migration 015_client_calls_drop_outcome_team_member.sql first so outcome/team_member are dropped.

INSERT INTO client_calls (
  client_id,
  user_id,
  organization_id,
  direction,
  phone_number,
  duration,
  summary,
  called_at,
  follow_up_at
) VALUES
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'outgoing',
  '(546) 546-5465',
  '25 min',
  'We setup for a visit next Tuesday with USA Steel. They asked to create a calendar invite for them to be reminded.',
  '2026-02-28T16:09:00Z',
  '2026-03-03T20:15:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'incoming',
  '(546) 546-5465',
  '12 min',
  'Client called to confirm the Tuesday visit time. Discussed parking and entry instructions.',
  '2026-02-27T10:30:00Z',
  NULL
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'outgoing',
  '(546) 546-5465',
  '8 min',
  'Left voicemail about the proposal. Asked them to call back by Friday.',
  '2026-02-26T14:00:00Z',
  '2026-02-28T17:00:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'incoming',
  '(546) 546-5465',
  '18 min',
  'Initial discovery call. Went over scope, timeline, and next steps. Sent follow-up email with quote.',
  '2026-02-25T09:15:00Z',
  '2026-02-26T12:00:00Z'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'outgoing',
  '(546) 546-5465',
  '5 min',
  'Quick check-in. They requested the calendar invite for Tuesday; confirmed we''ll send it today.',
  '2026-02-28T11:45:00Z',
  NULL
);
