-- Seed 10 proposals matching real client_proposals structure.
-- Path 1: org member whose user has clients → use that user_id, organization_id, org id_prefix, first client_id.
-- Path 2 (fallback): any user with clients → use that user_id, organization_id NULL, prefix 'SEX', first client_id.
-- Safe to run multiple times: only inserts when proposal_number does not already exist.

WITH org_with_client AS (
  SELECT
    om.user_id,
    om.organization_id,
    RPAD(COALESCE(
      NULLIF(TRIM(UPPER(SUBSTR(o.id_prefix, 1, 3))), ''),
      UPPER(REGEXP_REPLACE(SUBSTR(o.name, 1, 3), '[^A-Za-z]', '', 'g')),
      'LOT'
    ), 3, 'X') AS org_prefix,
    up.clients->0->>'id' AS client_id
  FROM public.org_members om
  JOIN public.organizations o ON o.id = om.organization_id
  JOIN public.user_profiles up ON up.id = om.user_id
  WHERE jsonb_typeof(up.clients) = 'array'
    AND jsonb_array_length(up.clients) > 0
    AND up.clients->0->>'id' IS NOT NULL
    AND TRIM(up.clients->0->>'id') <> ''
  LIMIT 1
),
solo_with_client AS (
  SELECT
    up.id AS user_id,
    NULL::uuid AS organization_id,
    'SEX' AS org_prefix,
    up.clients->0->>'id' AS client_id
  FROM public.user_profiles up
  WHERE jsonb_typeof(up.clients) = 'array'
    AND jsonb_array_length(up.clients) > 0
    AND up.clients->0->>'id' IS NOT NULL
    AND TRIM(up.clients->0->>'id') <> ''
  LIMIT 1
),
-- Fallback: use any existing proposal's user, org, client so seed runs when profile.clients is empty
from_existing AS (
  SELECT
    cp.user_id,
    cp.organization_id,
    COALESCE(
      (SELECT RPAD(NULLIF(TRIM(UPPER(SUBSTR(o.id_prefix, 1, 3))), ''), 3, 'X')
       FROM public.organizations o WHERE o.id = cp.organization_id LIMIT 1),
      'SEX'
    ) AS org_prefix,
    cp.client_id
  FROM public.client_proposals cp
  WHERE cp.client_id IS NOT NULL AND TRIM(cp.client_id) <> ''
  LIMIT 1
),
seed_row AS (
  SELECT user_id, organization_id, org_prefix, client_id FROM org_with_client
  UNION ALL
  SELECT user_id, organization_id, org_prefix, client_id FROM solo_with_client
  WHERE NOT EXISTS (SELECT 1 FROM org_with_client LIMIT 1)
  UNION ALL
  SELECT user_id, organization_id, org_prefix, client_id FROM from_existing
  WHERE NOT EXISTS (SELECT 1 FROM org_with_client LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM solo_with_client LIMIT 1)
  LIMIT 1
),
proposal_rows AS (
  SELECT
    s.user_id,
    s.organization_id,
    s.client_id,
    s.org_prefix AS id_prefix,
    v.title,
    (s.org_prefix || '-PROP-20260315-' || LPAD(v.seq::text, 3, '0')) AS proposal_number,
    v.date_created,
    v.date_sent,
    v.expiration_date,
    v.status,
    v.ever_sent
  FROM seed_row s
  CROSS JOIN (
    VALUES
      (1, 'Pipeline seed – Draft A', '2026-03-10'::date, NULL::date, '2026-12-31'::date, 'draft', false),
      (2, 'Pipeline seed – Draft B', '2026-03-12'::date, NULL::date, '2026-12-31'::date, 'draft', false),
      (3, 'Pipeline seed – Sent A', '2026-03-05'::date, '2026-03-06'::date, '2026-04-30'::date, 'sent', true),
      (4, 'Pipeline seed – Sent B', '2026-03-08'::date, '2026-03-09'::date, '2026-05-15'::date, 'sent', true),
      (5, 'Pipeline seed – Viewed', '2026-03-04'::date, '2026-03-05'::date, '2026-04-15'::date, 'viewed', true),
      (6, 'Pipeline seed – Accepted A', '2026-02-01'::date, '2026-02-05'::date, '2026-03-31'::date, 'accepted', true),
      (7, 'Pipeline seed – Accepted B', '2026-02-10'::date, '2026-02-12'::date, '2026-04-30'::date, 'accepted', true),
      (8, 'Pipeline seed – Expired A', '2026-01-05'::date, '2026-01-08'::date, '2026-01-31'::date, 'expired', true),
      (9, 'Pipeline seed – Expired B', '2025-12-15'::date, '2025-12-20'::date, '2026-01-15'::date, 'expired', true),
      (10, 'Pipeline seed – Rejected', '2026-03-02'::date, '2026-03-03'::date, '2026-04-30'::date, 'rejected', true)
  ) AS v(seq, title, date_created, date_sent, expiration_date, status, ever_sent)
)
INSERT INTO public.client_proposals (
  client_id,
  user_id,
  organization_id,
  proposal_title,
  proposal_number,
  date_created,
  date_sent,
  expiration_date,
  status,
  scope_summary,
  terms,
  file_url,
  file_urls,
  linked_project,
  linked_contract_id,
  line_items,
  ever_sent,
  tax,
  discount
)
SELECT
  pr.client_id,
  pr.user_id,
  pr.organization_id,
  pr.title,
  pr.proposal_number,
  pr.date_created,
  pr.date_sent,
  pr.expiration_date,
  pr.status,
  'Pipeline seed for dashboard chart.',
  'Initial payment is due before work order starts.',
  NULL,
  '{}',
  NULL,
  NULL,
  '[{"amount": "100.00", "quantity": 1, "item_name": "Pipeline seed item", "unit_price": "100.00", "description": ""}]'::jsonb,
  pr.ever_sent,
  '',
  ''
FROM proposal_rows pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_proposals cp
  WHERE cp.proposal_number = pr.proposal_number
);
