-- Backfill file_urls from file_url (run after 025).
UPDATE client_invoices
SET file_urls = ARRAY[file_url]
WHERE file_url IS NOT NULL AND file_url != '';
