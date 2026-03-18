-- Add template support to marketing_campaigns.
-- template_type: NULL (plain text body), 'mailchimp' (Mailchimp template), 'custom_html' (self-managed HTML).
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mailchimp_template_id INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mailchimp_template_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_html TEXT DEFAULT NULL;

COMMENT ON COLUMN public.marketing_campaigns.template_type IS 'NULL = plain text body, ''mailchimp'' = Mailchimp template, ''custom_html'' = custom HTML managed by GoManagr';
COMMENT ON COLUMN public.marketing_campaigns.mailchimp_template_id IS 'Mailchimp template ID when template_type = ''mailchimp''';
