-- Marketing campaigns table: persists campaign drafts, sent history, and metadata.
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  name TEXT NOT NULL DEFAULT '',
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  recipient_group TEXT NOT NULL DEFAULT 'clients',
  audience_mode TEXT NOT NULL DEFAULT 'all',
  selected_recipient_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  audience_size INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user_id ON public.marketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_org_id ON public.marketing_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel ON public.marketing_campaigns(channel);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own or org campaigns" ON public.marketing_campaigns;
CREATE POLICY "Users can view own or org campaigns" ON public.marketing_campaigns FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.marketing_campaigns;
CREATE POLICY "Users can insert own campaigns" ON public.marketing_campaigns FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.marketing_campaigns;
CREATE POLICY "Users can update own campaigns" ON public.marketing_campaigns FOR UPDATE
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.marketing_campaigns;
CREATE POLICY "Users can delete own campaigns" ON public.marketing_campaigns FOR DELETE
  USING (user_id = auth.uid()::text);
