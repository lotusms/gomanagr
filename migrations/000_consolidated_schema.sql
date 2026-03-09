-- Consolidated schema migration
-- Single file that defines the final database state (no intermediate adds/removes).
-- Use on a fresh database or for schema-only restores. Does not run data migrations.
-- Tables: user_profiles, organizations, org_members, org_invites, client_*, proposal_line_items (none),
-- invoice_line_items (none), tasks, task_activity, task_comments, platform_admins, backup_exports.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- user_profiles (replaces user_account; id = auth.uid())
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  trial BOOLEAN DEFAULT true,
  first_name TEXT,
  last_name TEXT,
  purpose TEXT,
  role TEXT,
  company_name TEXT,
  company_logo TEXT DEFAULT '',
  team_size TEXT,
  company_size TEXT,
  company_locations TEXT,
  sections_to_track JSONB DEFAULT '[]'::jsonb,
  referral_source TEXT,
  selected_palette TEXT DEFAULT 'palette1',
  dismissed_todo_ids JSONB DEFAULT '[]'::jsonb,
  team_members JSONB DEFAULT '[]'::jsonb,
  clients JSONB DEFAULT '[]'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  appointments JSONB DEFAULT '[]'::jsonb,
  profile JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'User profile and app data; id = auth.uid()';

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Prevent direct profile creation" ON public.user_profiles;

CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Prevent direct profile creation"
  ON public.user_profiles FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  alt_logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  company_locations TEXT,
  team_size TEXT,
  sections_to_track JSONB DEFAULT '[]'::jsonb,
  trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  selected_palette TEXT DEFAULT 'palette1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  id_prefix TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  website TEXT,
  business_hours_start TEXT DEFAULT '08:00',
  business_hours_end TEXT DEFAULT '18:00',
  locations JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_organizations_id_prefix ON public.organizations(id_prefix) WHERE id_prefix IS NOT NULL;

COMMENT ON COLUMN public.organizations.id_prefix IS '3-letter uppercase prefix for document IDs (e.g. LOT, CHA, STA).';

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Prevent direct org creation" ON public.organizations;

CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'developer')
    )
  );

CREATE POLICY "Prevent direct org creation"
  ON public.organizations FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- org_members (role: superadmin | admin | developer | member)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'developer', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_user_org_membership(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE organization_id = org_id AND user_id = check_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_org_admin(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE organization_id = org_id AND user_id = check_user_id
    AND role IN ('superadmin', 'admin', 'developer')
  );
END;
$$;

DROP POLICY IF EXISTS "Users can view their own membership" ON public.org_members;
DROP POLICY IF EXISTS "Users can view members in their organizations" ON public.org_members;
DROP POLICY IF EXISTS "Admins can insert org members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can update org members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can delete org members" ON public.org_members;
DROP POLICY IF EXISTS "Prevent self-adding to orgs" ON public.org_members;

CREATE POLICY "Users can view their own membership"
  ON public.org_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their organizations"
  ON public.org_members FOR SELECT
  USING (public.check_user_org_membership(organization_id));

CREATE POLICY "Admins can insert org members"
  ON public.org_members FOR INSERT
  WITH CHECK (public.check_user_org_admin(organization_id));

CREATE POLICY "Admins can update org members"
  ON public.org_members FOR UPDATE
  USING (public.check_user_org_admin(organization_id));

CREATE POLICY "Admins can delete org members"
  ON public.org_members FOR DELETE
  USING (public.check_user_org_admin(organization_id));

CREATE POLICY "Prevent self-adding to orgs"
  ON public.org_members FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- org_invites (invitee_data from 007)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'member')) DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  invitee_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON public.org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON public.org_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_used ON public.org_invites(used);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Admins can create org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Admins can update org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.org_invites;

CREATE POLICY "Admins can view org invites"
  ON public.org_invites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'developer')
    )
  );

CREATE POLICY "Admins can create org invites"
  ON public.org_invites FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'developer')
    )
  );

CREATE POLICY "Admins can update org invites"
  ON public.org_invites FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin', 'developer')
    )
  );

CREATE POLICY "Anyone can view invite by token"
  ON public.org_invites FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- client_emails (no summary column)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')) DEFAULT 'sent',
  to_from TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_project_case TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_emails_client_id ON public.client_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_org_id ON public.client_emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_user_id ON public.client_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_sent_at ON public.client_emails(sent_at);

ALTER TABLE public.client_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client emails" ON public.client_emails FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client emails" ON public.client_emails FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client emails" ON public.client_emails FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client emails" ON public.client_emails FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_messages (author, not to_from)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'chat', 'other')) DEFAULT 'other',
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')) DEFAULT 'sent',
  author TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON public.client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_org_id ON public.client_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_user_id ON public.client_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_sent_at ON public.client_messages(sent_at);

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client messages" ON public.client_messages FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client messages" ON public.client_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client messages" ON public.client_messages FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client messages" ON public.client_messages FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_calls (no outcome, no team_member)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')) DEFAULT 'outgoing',
  phone_number TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  follow_up_at TIMESTAMPTZ,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_calls_client_id ON public.client_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_org_id ON public.client_calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_user_id ON public.client_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_called_at ON public.client_calls(called_at);

ALTER TABLE public.client_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client calls" ON public.client_calls FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client calls" ON public.client_calls FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client calls" ON public.client_calls FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client calls" ON public.client_calls FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_meeting_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  meeting_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attendees TEXT NOT NULL DEFAULT '',
  location_zoom_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  decisions_made TEXT NOT NULL DEFAULT '',
  action_items TEXT NOT NULL DEFAULT '',
  next_meeting_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_client_id ON public.client_meeting_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_org_id ON public.client_meeting_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_user_id ON public.client_meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_meeting_at ON public.client_meeting_notes(meeting_at);

ALTER TABLE public.client_meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client meeting notes" ON public.client_meeting_notes FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client meeting notes" ON public.client_meeting_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client meeting notes" ON public.client_meeting_notes FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client meeting notes" ON public.client_meeting_notes FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_internal_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  tag TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT client_internal_notes_tag_check CHECK (tag IS NULL OR tag IN ('reminder', 'warning', 'preference', 'billing', 'issue'))
);

CREATE INDEX IF NOT EXISTS idx_client_internal_notes_client_id ON public.client_internal_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_org_id ON public.client_internal_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_user_id ON public.client_internal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_is_pinned ON public.client_internal_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_created_at ON public.client_internal_notes(created_at DESC);

ALTER TABLE public.client_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client internal notes" ON public.client_internal_notes FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client internal notes" ON public.client_internal_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client internal notes" ON public.client_internal_notes FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client internal notes" ON public.client_internal_notes FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_contracts (final: status draft|active|inactive|completed|abandoned; no effective_date/renewal_date; has related_proposal_id, related_project_id, file_urls)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_title TEXT NOT NULL DEFAULT '',
  contract_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'inactive', 'completed', 'abandoned')),
  contract_type TEXT
    CHECK (contract_type IS NULL OR contract_type IN (
      'service_agreement', 'retainer_agreement', 'maintenance_agreement', 'nda', 'vendor_agreement'
    )),
  start_date DATE,
  end_date DATE,
  contract_value TEXT NOT NULL DEFAULT '',
  scope_summary TEXT NOT NULL DEFAULT '',
  signed_by TEXT NOT NULL DEFAULT '',
  signed_date DATE,
  file_url TEXT,
  file_urls TEXT[] DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  related_proposal_id UUID,
  related_project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_contracts_client_id ON public.client_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_org_id ON public.client_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_user_id ON public.client_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_status ON public.client_contracts(status);
CREATE INDEX IF NOT EXISTS idx_client_contracts_related_proposal_id ON public.client_contracts(related_proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_related_project_id ON public.client_contracts(related_project_id);

ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client contracts" ON public.client_contracts FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client contracts" ON public.client_contracts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client contracts" ON public.client_contracts FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client contracts" ON public.client_contracts FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_proposals (no estimated_value, no included_services_products; has line_items JSONB, file_urls, ever_sent, tax, discount, linked_contract_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_title TEXT NOT NULL DEFAULT '',
  proposal_number TEXT NOT NULL DEFAULT '',
  date_created DATE,
  date_sent DATE,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  scope_summary TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  file_urls TEXT[] DEFAULT '{}',
  linked_project TEXT,
  linked_contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ever_sent BOOLEAN NOT NULL DEFAULT false,
  tax TEXT NOT NULL DEFAULT '',
  discount TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_proposals_client_id ON public.client_proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_proposals_org_id ON public.client_proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_proposals_user_id ON public.client_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_client_proposals_status ON public.client_proposals(status);
CREATE INDEX IF NOT EXISTS idx_client_proposals_expiration_date ON public.client_proposals(expiration_date);
CREATE INDEX IF NOT EXISTS idx_client_proposals_linked_contract ON public.client_proposals(linked_contract_id);

ALTER TABLE public.client_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client proposals" ON public.client_proposals FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client proposals" ON public.client_proposals FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client proposals" ON public.client_proposals FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client proposals" ON public.client_proposals FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- Add FKs for client_contracts that reference client_proposals and client_projects (after those tables exist)
ALTER TABLE public.client_contracts
  DROP CONSTRAINT IF EXISTS client_contracts_related_proposal_id_fkey;
ALTER TABLE public.client_contracts
  ADD CONSTRAINT client_contracts_related_proposal_id_fkey
  FOREIGN KEY (related_proposal_id) REFERENCES public.client_proposals(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- client_invoices (final: file_urls, line_items JSONB, discount, ever_sent, date_sent, payment_terms, paid_status, terms, scope_summary; no notes, no related_service)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL DEFAULT '',
  invoice_title TEXT NOT NULL DEFAULT '',
  amount TEXT NOT NULL DEFAULT '',
  tax TEXT NOT NULL DEFAULT '',
  total TEXT NOT NULL DEFAULT '',
  discount TEXT NOT NULL DEFAULT '',
  date_issued DATE,
  due_date DATE,
  paid_date DATE,
  date_sent DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'overdue', 'paid', 'partially_paid', 'void')),
  payment_method TEXT NOT NULL DEFAULT '',
  outstanding_balance TEXT NOT NULL DEFAULT '',
  payment_terms TEXT DEFAULT '',
  paid_status TEXT DEFAULT '',
  file_url TEXT,
  file_urls TEXT[] DEFAULT '{}',
  related_proposal_id UUID REFERENCES public.client_proposals(id) ON DELETE SET NULL,
  related_project TEXT,
  linked_contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  terms TEXT DEFAULT '',
  scope_summary TEXT DEFAULT '',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ever_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_invoices_client_id ON public.client_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_org_id ON public.client_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_user_id ON public.client_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_status ON public.client_invoices(status);
CREATE INDEX IF NOT EXISTS idx_client_invoices_date_issued ON public.client_invoices(date_issued);
CREATE INDEX IF NOT EXISTS idx_client_invoices_due_date ON public.client_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_client_invoices_related_proposal ON public.client_invoices(related_proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_linked_contract ON public.client_invoices(linked_contract_id);

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client invoices" ON public.client_invoices FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client invoices" ON public.client_invoices FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client invoices" ON public.client_invoices FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client invoices" ON public.client_invoices FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_projects (final: scope_summary, status draft|active|inactive|on_hold|completed|abandoned, project_number, project_owner, related_proposal_id, related_contract_id, related_project_id, notes, file_urls)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL DEFAULT '',
  project_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'inactive', 'on_hold', 'completed', 'abandoned')),
  start_date DATE,
  end_date DATE,
  scope_summary TEXT NOT NULL DEFAULT '',
  project_owner TEXT NOT NULL DEFAULT '',
  related_proposal_id UUID REFERENCES public.client_proposals(id) ON DELETE SET NULL,
  related_contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  file_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON public.client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_org_id ON public.client_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_user_id ON public.client_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON public.client_projects(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_start_date ON public.client_projects(start_date);
CREATE INDEX IF NOT EXISTS idx_client_projects_end_date ON public.client_projects(end_date);
CREATE INDEX IF NOT EXISTS idx_client_projects_related_proposal_id ON public.client_projects(related_proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_related_contract_id ON public.client_projects(related_contract_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_related_project_id ON public.client_projects(related_project_id);

ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client projects" ON public.client_projects FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client projects" ON public.client_projects FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client projects" ON public.client_projects FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client projects" ON public.client_projects FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- Add related_project_id FK on client_contracts (references client_projects)
ALTER TABLE public.client_contracts
  DROP CONSTRAINT IF EXISTS client_contracts_related_project_id_fkey;
ALTER TABLE public.client_contracts
  ADD CONSTRAINT client_contracts_related_project_id_fkey
  FOREIGN KEY (related_project_id) REFERENCES public.client_projects(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- client_attachments (no category; has linked_contract_id, linked_proposal_id, linked_invoice_id, linked_email_id, linked_project_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  upload_date DATE,
  related_item TEXT,
  version TEXT,
  file_url TEXT,
  linked_contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  linked_proposal_id UUID REFERENCES public.client_proposals(id) ON DELETE SET NULL,
  linked_invoice_id UUID REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  linked_email_id UUID REFERENCES public.client_emails(id) ON DELETE SET NULL,
  linked_project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_attachments_client_id ON public.client_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_org_id ON public.client_attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_user_id ON public.client_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_upload_date ON public.client_attachments(upload_date);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_contract_id ON public.client_attachments(linked_contract_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_proposal_id ON public.client_attachments(linked_proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_invoice_id ON public.client_attachments(linked_invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_email_id ON public.client_attachments(linked_email_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_project_id ON public.client_attachments(linked_project_id);

ALTER TABLE public.client_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client attachments" ON public.client_attachments FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client attachments" ON public.client_attachments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client attachments" ON public.client_attachments FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client attachments" ON public.client_attachments FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- client_online_resources (related_password, has_admin_access)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_online_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  resource_type TEXT,
  description TEXT NOT NULL DEFAULT '',
  login_email_username TEXT,
  related_password TEXT,
  has_admin_access BOOLEAN NOT NULL DEFAULT false,
  access_instructions TEXT NOT NULL DEFAULT '',
  date_added DATE,
  last_verified_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_online_resources_client_id ON public.client_online_resources(client_id);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_org_id ON public.client_online_resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_user_id ON public.client_online_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_resource_type ON public.client_online_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_date_added ON public.client_online_resources(date_added);

ALTER TABLE public.client_online_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client online resources" ON public.client_online_resources FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can insert own or org client online resources" ON public.client_online_resources FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update own or org client online resources" ON public.client_online_resources FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can delete own or org client online resources" ON public.client_online_resources FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- tasks (org-scoped work items; status workflow: backlog → to_do → in_progress → blocked → done)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  client_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'to_do'
    CHECK (status IN ('backlog', 'to_do', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  position DOUBLE PRECISION,
  task_number TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb,
  linked_client_id TEXT,
  linked_project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  linked_invoice_id UUID REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  linked_proposal_id UUID REFERENCES public.client_proposals(id) ON DELETE SET NULL,
  linked_appointment_id TEXT,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status_position ON public.tasks(status, position NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON public.tasks(task_number) WHERE task_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_org_task_number ON public.tasks(organization_id, task_number) WHERE task_number IS NOT NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their org"
  ON public.tasks FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert tasks in their org"
  ON public.tasks FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update tasks in their org"
  ON public.tasks FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks in their org"
  ON public.tasks FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- task_activity (activity feed per task: created, status, assignee, due_at, title, priority, client, project)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'status', 'assignee', 'due_at', 'title', 'priority', 'client', 'project')),
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON public.task_activity(created_at DESC);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task activity in their org"
  ON public.task_activity FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert task activity in their org"
  ON public.task_activity FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- task_comments (comments per task)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at DESC);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments in their org"
  ON public.task_comments FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert task comments in their org"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own task comments"
  ON public.task_comments FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- platform_admins (auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_admins IS 'Platform operators; only these users can run master backup.';

-- ---------------------------------------------------------------------------
-- backup_exports (auth.users; audit columns including checksum)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backup_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('org', 'master')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_path TEXT,
  row_counts JSONB,
  user_agent TEXT,
  ip_address INET,
  checksum TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_exports_user_exported ON public.backup_exports(user_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_exports_org_exported ON public.backup_exports(organization_id, exported_at DESC) WHERE organization_id IS NOT NULL;

COMMENT ON TABLE public.backup_exports IS 'Audit trail for backup exports; used for rate limiting and compliance.';
COMMENT ON COLUMN public.backup_exports.checksum IS 'Optional SHA-256 hash of the exported JSON for integrity verification.';
