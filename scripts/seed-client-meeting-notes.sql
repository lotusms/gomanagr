-- Seed: 4 client_meeting_notes for client CL-20260227-H84DQ4 in organization f55b3569-60f7-47a5-a79c-2464f0a28412
--
-- Run this in the Supabase SQL editor. user_id is taken from the first org member so RLS allows the rows.
-- Run migration 012_client_meeting_notes.sql first.

INSERT INTO client_meeting_notes (
  client_id,
  user_id,
  organization_id,
  title,
  meeting_at,
  attendees,
  location_zoom_link,
  notes,
  decisions_made,
  action_items,
  next_meeting_date
) VALUES
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'First Consultation',
  '2026-02-28T11:32:00Z',
  'email@email.com, second@email.com, newone@email.com',
  'https://www.someurl.com',
  'We needed to get an idea of the project. The stakeholders where invited and the project manager as well. We explained the project in detail Everyone liked the ideas and approved for further actions',
  'The project was approved with conditions',
  'Renew conditions before setting up the project. Send for approval and then create the project when approved',
  '2026-03-20'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'Kickoff & Scope Review',
  '2026-03-05T14:00:00Z',
  'pm@client.com, lead@client.com, l.silva@gomanagr.com',
  'https://zoom.us/j/123456789',
  'Walked through SOW and timeline. Client confirmed budget and key milestones. Discussed reporting cadence and who will be on the weekly sync.',
  'Scope and timeline approved. Weekly syncs every Tuesday 2pm.',
  'Send signed SOW by Friday. Set up project workspace and invite stakeholders. First deliverable due March 19.',
  '2026-03-12'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'Weekly Sync',
  '2026-03-12T14:00:00Z',
  'pm@client.com, l.silva@gomanagr.com',
  '',
  'Reviewed progress on Phase 1. Blockers: waiting on brand assets from client. Dev environment is ready. Next week we start integration.',
  'No scope change. Client to send assets by March 15.',
  'Client: send brand kit. Us: send integration checklist and access to staging.',
  '2026-03-19'
),
(
  'CL-20260227-H84DQ4',
  (SELECT user_id FROM org_members WHERE organization_id = 'f55b3569-60f7-47a5-a79c-2464f0a28412' LIMIT 1),
  'f55b3569-60f7-47a5-a79c-2464f0a28412'::uuid,
  'UAT Prep & Handoff',
  '2026-03-26T10:00:00Z',
  'pm@client.com, lead@client.com, qa@client.com, l.silva@gomanagr.com',
  'https://meet.google.com/abc-defg-hij',
  'Demo of staging environment. Walked through UAT script and success criteria. Client asked for one copy change on the dashboard label.',
  'UAT to start April 1. Go-live target April 15 pending sign-off.',
  'We apply copy change and redeploy to staging by March 28. Client to complete UAT by April 8 and send sign-off.',
  '2026-04-01'
);
