-- Allow multiple proposal files. file_url remains for backward compatibility.
-- Step 1: add the column only. Run 024_client_proposals_file_urls_backfill.sql after this.
ALTER TABLE client_proposals
  ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';
