-- Allow multiple contract files. file_url remains for backward compatibility (single file).

ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';

-- Backfill: copy existing file_url into file_urls when file_urls is empty
UPDATE client_contracts
SET file_urls = ARRAY[file_url]
WHERE file_url IS NOT NULL AND file_url != ''
  AND (file_urls IS NULL OR file_urls = '{}');
