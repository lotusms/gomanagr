-- Add 3-letter organization prefix for document IDs (e.g. LOT, CHA, STA).
-- Used in structured IDs: [OrgPrefix]-[DocPrefix]-[YYYYMMDD]-[Sequence]

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS id_prefix TEXT;

COMMENT ON COLUMN organizations.id_prefix IS '3-letter uppercase prefix for document IDs (e.g. LOT, CHA, STA). When null, API uses fallback (e.g. PER for personal, or first 3 of name).';

CREATE INDEX IF NOT EXISTS idx_organizations_id_prefix ON organizations(id_prefix) WHERE id_prefix IS NOT NULL;
