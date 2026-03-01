-- Backfill file_urls from file_url (run after 023_client_proposals_file_urls.sql).
UPDATE client_proposals
SET file_urls = ARRAY[file_url]
WHERE file_url IS NOT NULL AND file_url != '';