-- Reassign seeded proposals and invoices to spread across the three clients.
-- Clients: CL-20260227-H84DQ4 (Johnny Carson), CL-20260227-PMZ33L (Mary Poppins), CL-20260227-2GY5UB (Arnold Schwartzeneger)
-- Only updates rows matching the seed proposal_number / invoice_number patterns.

-- Seeded proposals: %-PROP-20260315-001 through 010
-- Assign by sequence: 001,004,007,010 -> H84DQ4; 002,005,008 -> PMZ33L; 003,006,009 -> 2GY5UB
UPDATE public.client_proposals
SET client_id = CASE
  WHEN proposal_number ~ '^[A-Z]{3}-PROP-20260315-(001|004|007|010)$' THEN 'CL-20260227-H84DQ4'
  WHEN proposal_number ~ '^[A-Z]{3}-PROP-20260315-(002|005|008)$' THEN 'CL-20260227-PMZ33L'
  WHEN proposal_number ~ '^[A-Z]{3}-PROP-20260315-(003|006|009)$' THEN 'CL-20260227-2GY5UB'
  ELSE client_id
END
WHERE proposal_number ~ '^[A-Z]{3}-PROP-20260315-[0-9]+$';

-- Seeded invoices: %-INV-20260316-001 through 010
-- Same client mapping by sequence
UPDATE public.client_invoices
SET client_id = CASE
  WHEN invoice_number ~ '^[A-Z]{3}-INV-20260316-(001|004|007|010)$' THEN 'CL-20260227-H84DQ4'
  WHEN invoice_number ~ '^[A-Z]{3}-INV-20260316-(002|005|008)$' THEN 'CL-20260227-PMZ33L'
  WHEN invoice_number ~ '^[A-Z]{3}-INV-20260316-(003|006|009)$' THEN 'CL-20260227-2GY5UB'
  ELSE client_id
END
WHERE invoice_number ~ '^[A-Z]{3}-INV-20260316-[0-9]+$';
