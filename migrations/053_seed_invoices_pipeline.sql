-- Seed invoices matching real client_invoices structure, linked to proposals from 052_seed_proposals_pipeline.
-- Uses same source as proposal seed: org_with_client, solo_with_client, or from_existing (invoices then proposals).
-- Invoice numbers: {prefix}-INV-20260316-001..010. related_proposal_id = id of seeded proposal (LOT-PROP-20260315-001..010).
-- Safe to run multiple times: only inserts when invoice_number does not already exist.

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
from_existing AS (
  SELECT
    inv.user_id,
    inv.organization_id,
    COALESCE(
      (SELECT RPAD(NULLIF(TRIM(UPPER(SUBSTR(o.id_prefix, 1, 3))), ''), 3, 'X')
       FROM public.organizations o WHERE o.id = inv.organization_id LIMIT 1),
      'SEX'
    ) AS org_prefix,
    inv.client_id
  FROM public.client_invoices inv
  WHERE inv.client_id IS NOT NULL AND TRIM(inv.client_id) <> ''
  LIMIT 1
),
from_proposals AS (
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
  UNION ALL
  SELECT user_id, organization_id, org_prefix, client_id FROM from_proposals
  WHERE NOT EXISTS (SELECT 1 FROM org_with_client LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM solo_with_client LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM from_existing LIMIT 1)
  LIMIT 1
),
-- Seeded proposals from 052: proposal_number like %-PROP-20260315-%
proposal_ids AS (
  SELECT id AS related_proposal_id, ROW_NUMBER() OVER (ORDER BY proposal_number) AS rn
  FROM public.client_proposals
  WHERE proposal_number ~ '^[A-Z]{3}-PROP-20260315-[0-9]+$'
),
invoice_rows AS (
  SELECT
    s.user_id,
    s.organization_id,
    s.client_id,
    s.org_prefix,
    v.seq,
    v.invoice_title,
    v.date_issued,
    v.due_date,
    v.paid_date,
    v.status,
    v.total_amt,
    v.ever_sent,
    v.date_sent,
    p.related_proposal_id
  FROM seed_row s
  CROSS JOIN (
    VALUES
      (1, 'Pipeline seed invoice – Draft A', '2026-03-16'::date, '2026-04-16'::date, NULL::date, 'draft', '500.00', false, NULL::date),
      (2, 'Pipeline seed invoice – Draft B', '2026-03-17'::date, '2026-04-17'::date, NULL::date, 'draft', '750.00', false, NULL::date),
      (3, 'Pipeline seed invoice – Sent', '2026-03-10'::date, '2026-04-10'::date, NULL::date, 'sent', '1200.00', true, '2026-03-11'::date),
      (4, 'Pipeline seed invoice – Overdue', '2026-02-01'::date, '2026-03-01'::date, NULL::date, 'overdue', '800.00', true, '2026-02-02'::date),
      (5, 'Pipeline seed invoice – Paid', '2026-02-15'::date, '2026-03-15'::date, '2026-03-10'::date, 'paid', '2000.00', true, '2026-02-16'::date),
      (6, 'Pipeline seed invoice – Partially paid', '2026-03-01'::date, '2026-04-01'::date, NULL::date, 'partially_paid', '1500.00', true, '2026-03-02'::date),
      (7, 'Pipeline seed invoice – Due soon', '2026-03-12'::date, '2026-03-25'::date, NULL::date, 'sent', '900.00', true, '2026-03-13'::date),
      (8, 'Pipeline seed invoice – Draft C', '2026-03-18'::date, NULL::date, NULL::date, 'draft', '600.00', false, NULL::date),
      (9, 'Pipeline seed invoice – Sent B', '2026-03-08'::date, '2026-04-08'::date, NULL::date, 'sent', '1100.00', true, '2026-03-09'::date),
      (10, 'Pipeline seed invoice – Paid B', '2026-02-20'::date, '2026-03-20'::date, '2026-03-18'::date, 'paid', '3200.00', true, '2026-02-21'::date)
  ) AS v(seq, invoice_title, date_issued, due_date, paid_date, status, total_amt, ever_sent, date_sent)
  LEFT JOIN proposal_ids p ON p.rn = v.seq
)
INSERT INTO public.client_invoices (
  client_id,
  user_id,
  organization_id,
  invoice_number,
  invoice_title,
  amount,
  tax,
  total,
  discount,
  date_issued,
  due_date,
  paid_date,
  date_sent,
  status,
  payment_method,
  outstanding_balance,
  payment_terms,
  paid_status,
  file_url,
  file_urls,
  related_proposal_id,
  related_project,
  linked_contract_id,
  terms,
  scope_summary,
  line_items,
  ever_sent
)
SELECT
  ir.client_id,
  ir.user_id,
  ir.organization_id,
  (ir.org_prefix || '-INV-20260316-' || LPAD(ir.seq::text, 3, '0')),
  ir.invoice_title,
  ir.total_amt,
  '',
  ir.total_amt,
  '',
  ir.date_issued,
  ir.due_date,
  ir.paid_date,
  ir.date_sent,
  ir.status,
  '',
  CASE
    WHEN ir.status = 'paid' THEN '0'
    WHEN ir.status = 'partially_paid' THEN (ir.total_amt::numeric * 0.5)::text
    ELSE ir.total_amt
  END,
  'due_on_receipt',
  '',
  NULL,
  '{}',
  ir.related_proposal_id,
  NULL,
  NULL,
  'Initial payment is due before work order starts.',
  'Pipeline seed for dashboard.',
  '[{"amount": "100.00", "quantity": 1, "item_name": "Pipeline seed item", "unit_price": "100.00", "description": ""}]'::jsonb,
  ir.ever_sent
FROM invoice_rows ir
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_invoices inv
  WHERE inv.invoice_number = (ir.org_prefix || '-INV-20260316-' || LPAD(ir.seq::text, 3, '0'))
);
