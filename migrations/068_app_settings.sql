-- Global app settings (e.g. Stripe API keys). Single row per key.
-- Access controlled in API layer (superadmin/developer only). Use service role for read/write.

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'Global app configuration (Stripe, etc.). Read/write via API with role check.';

-- No RLS: API uses service role only; no direct client access.
