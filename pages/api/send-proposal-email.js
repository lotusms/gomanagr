/**
 * Send a proposal copy by email to the client's email on file.
 * POST body: { userId, organizationId?, proposalId, to }
 * Uses the tenant's Resend/Mailchimp connection (Settings > Integrations). No fallback to .env SMTP/Resend.
 */

import { createClient } from '@supabase/supabase-js';
import { renderDocumentToHtml } from '@/lib/renderDocumentToHtml';
import { sendTenantEmail } from '@/lib/sendTenantEmail';

let supabaseAdmin;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

function unformatNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, organizationId, proposalId, to, clientName: clientNameBody, clientContactName: clientContactNameBody } = req.body || {};
  if (!userId || !proposalId || !to || !String(to).trim()) {
    return res.status(400).json({ error: 'Missing userId, proposalId, or to (client email)' });
  }

  const toEmail = String(to).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  try {
    const { data: proposal, error: fetchErr } = await supabaseAdmin
      .from('client_proposals')
      .select('id, proposal_title, proposal_number, user_id, organization_id, client_id, date_created, date_sent, expiration_date, scope_summary, terms, tax, discount, line_items')
      .eq('id', proposalId)
      .limit(1)
      .single();

    if (fetchErr || !proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (organizationId) {
      if (proposal.organization_id !== organizationId) return res.status(403).json({ error: 'Proposal does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (proposal.organization_id != null || proposal.user_id !== userId) return res.status(403).json({ error: 'Proposal does not belong to you' });
    }

    const orgId = organizationId || proposal.organization_id || null;
    if (!orgId) {
      return res.status(503).json({
        error: 'No organization context',
        message: 'Proposal email requires an organization. Configure Resend or Mailchimp in Settings > Integrations.',
      });
    }

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
    const title = (proposal.proposal_title || 'Proposal').trim();
    const number = (proposal.proposal_number || '').trim();
    const subject = number ? `Proposal: ${title} (${number})` : `Proposal: ${title}`;

    let companyName = appName;
    let companyLogoUrl = '';
    let orgName = '';
    let orgLogoUrl = '';
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name, company_logo, clients, profile')
      .eq('id', proposal.user_id)
      .limit(1)
      .maybeSingle();
    if (profile?.company_name) companyName = String(profile.company_name).trim();
    if (profile?.company_logo) companyLogoUrl = String(profile.company_logo).trim();
    const profileJson = profile?.profile && typeof profile.profile === 'object' ? profile.profile : {};
    let orgAddressLines = [];
    let orgPhone = '';
    let orgWebsite = '';
    if (organizationId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, logo_url, address_line_1, address_line_2, city, state, postal_code, country, phone, website')
        .eq('id', organizationId)
        .limit(1)
        .maybeSingle();
      if (org?.name) orgName = String(org.name).trim();
      if (org?.logo_url) orgLogoUrl = String(org.logo_url).trim();
      if (org?.address_line_1?.trim()) {
        orgAddressLines = [org.address_line_1.trim()];
        if (org.address_line_2?.trim()) orgAddressLines.push(org.address_line_2.trim());
        const cityStateZip = [org.city, org.state, org.postal_code].filter(Boolean).map((s) => String(s).trim()).join(', ');
        if (cityStateZip) orgAddressLines.push(cityStateZip);
        if (org.country?.trim()) orgAddressLines.push(org.country.trim());
      }
      if (org?.phone?.trim()) orgPhone = String(org.phone).trim();
      if (org?.website?.trim()) orgWebsite = String(org.website).trim();
    }
    const displayName = orgName || companyName;
    const displayLogo = orgLogoUrl || companyLogoUrl;
    const profileAddressLines = Array.isArray(profileJson.companyAddressLines)
      ? profileJson.companyAddressLines.filter(Boolean)
      : profileJson.companyAddress
        ? [String(profileJson.companyAddress).trim()].filter(Boolean)
        : [];
    const companyAddressLines = orgAddressLines.length > 0 ? orgAddressLines : profileAddressLines;
    const companyPhone = orgPhone || (profileJson.companyPhone && String(profileJson.companyPhone).trim()) || undefined;
    const companyWebsite = orgWebsite || (profileJson.companyWebsite && String(profileJson.companyWebsite).trim()) || undefined;

    let clientName = (clientNameBody && String(clientNameBody).trim()) || '';
    let clientContactName = (clientContactNameBody && String(clientContactNameBody).trim()) || '';
    let clientAddressLines = [];
    if (proposal.client_id && profile?.clients && Array.isArray(profile.clients)) {
      const client = profile.clients.find((c) => c.id === proposal.client_id);
      if (client) {
        if (!clientName) clientName = (client.name || client.companyName || client.company || '').trim() || (client.firstName || client.lastName ? [client.firstName, client.lastName].filter(Boolean).join(' ') : '');
        if (!clientContactName) clientContactName = (client.contactName || client.contact || '').trim();
        const billing = client.billingAddress || {};
        const company = client.companyAddress || {};
        const line1 = billing.address1 || billing.address || company.address1 || company.address || '';
        const line2 = billing.address2 || company.address2 || '';
        clientAddressLines = [line1, line2].filter(Boolean);
      }
    }
    if (!clientName) clientName = toEmail;

    const lineItems = Array.isArray(proposal.line_items) ? proposal.line_items : [];
    let subtotal = 0;
    for (const row of lineItems) {
      const amt = row.amount != null ? unformatNum(row.amount) : (unformatNum(row.quantity) * unformatNum(row.unit_price));
      subtotal += amt;
    }
    const docPayload = {
      title,
      number,
      dateCreated: proposal.date_created || null,
      dateSent: proposal.date_sent || null,
      expirationDate: proposal.expiration_date || null,
      lineItems: lineItems.map((r) => ({
        item_name: r.item_name ?? '',
        description: r.description ?? '',
        quantity: r.quantity ?? '',
        unit_price: r.unit_price ?? '',
        amount: r.amount != null ? String(r.amount) : (unformatNum(r.quantity) * unformatNum(r.unit_price)).toFixed(2),
      })),
      scopeSummary: proposal.scope_summary ?? '',
      terms: proposal.terms ?? '',
      subtotal,
      tax: unformatNum(proposal.tax),
      discount: unformatNum(proposal.discount),
      total: subtotal - unformatNum(proposal.discount) + unformatNum(proposal.tax),
      amountDue: subtotal - unformatNum(proposal.discount) + unformatNum(proposal.tax),
    };

    const html = renderDocumentToHtml({
      type: 'proposal',
      company: {
        name: displayName,
        ...(displayLogo && { logoUrl: displayLogo }),
        ...(companyAddressLines.length > 0 && { addressLines: companyAddressLines }),
        ...(companyPhone && { phone: companyPhone }),
        ...(companyWebsite && { website: companyWebsite }),
      },
      client: {
        name: clientName || toEmail,
        email: toEmail,
        contactName: clientContactName || undefined,
        ...(clientAddressLines.length > 0 ? { addressLines: clientAddressLines } : {}),
      },
      document: docPayload,
      currency: 'USD',
    });

    const dateSentToday = new Date().toISOString().slice(0, 10);
    const result = await sendTenantEmail(orgId, { to: toEmail, subject, html });
    if (!result.sent) {
      return res.status(503).json({
        error: result.error || 'Failed to send email',
        message: result.error || 'Configure Resend or Mailchimp in Settings > Integrations to send proposal emails.',
      });
    }
    await supabaseAdmin.from('client_proposals').update({ ever_sent: true, date_sent: dateSentToday, updated_at: new Date().toISOString() }).eq('id', proposalId);
    return res.status(200).json({ sent: true, message: 'Proposal email sent' });
  } catch (err) {
    console.error('[send-proposal-email]', err);
    return res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
}
