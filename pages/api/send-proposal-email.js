/**
 * Send a proposal copy by email to the client's email on file.
 * POST body: { userId, organizationId?, proposalId, to }
 * Uses same SMTP/Resend config as send-invite-email.
 * Email body is a rich HTML version of the proposal (company logo, line items, totals).
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { renderDocumentToHtml } from '@/lib/renderDocumentToHtml';

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
      .select('id, proposal_title, proposal_number, user_id, organization_id, client_id, date_created, date_sent, expiration_date, scope_summary, terms, line_items')
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

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
    const fromName = process.env.SMTP_FROM_NAME || appName;
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
    if (organizationId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, logo_url')
        .eq('id', organizationId)
        .limit(1)
        .maybeSingle();
      if (org?.name) orgName = String(org.name).trim();
      if (org?.logo_url) orgLogoUrl = String(org.logo_url).trim();
    }
    const displayName = orgName || companyName;
    const displayLogo = orgLogoUrl || companyLogoUrl;
    const companyAddressLines = Array.isArray(profileJson.companyAddressLines)
      ? profileJson.companyAddressLines.filter(Boolean)
      : profileJson.companyAddress
        ? [String(profileJson.companyAddress).trim()].filter(Boolean)
        : [];
    const companyPhone = (profileJson.companyPhone && String(profileJson.companyPhone).trim()) || undefined;
    const companyWebsite = (profileJson.companyWebsite && String(profileJson.companyWebsite).trim()) || undefined;

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
      tax: 0,
      discount: 0,
      total: subtotal,
      amountDue: subtotal,
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

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'info@lotusmarketingsolutions.com';

    const dateSentToday = new Date().toISOString().slice(0, 10);

    if (smtpHost && smtpUser && smtpPass) {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true';
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: { user: smtpUser, pass: smtpPass },
      });
      const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
      await transporter.sendMail({ from, to: toEmail, subject, html });
      await supabaseAdmin.from('client_proposals').update({ ever_sent: true, date_sent: dateSentToday, updated_at: new Date().toISOString() }).eq('id', proposalId);
      return res.status(200).json({ sent: true, message: 'Proposal email sent' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const { error } = await resend.emails.send({ from, to: [toEmail], subject, html });
      if (error) {
        console.error('[send-proposal-email] Resend error:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
      }
      await supabaseAdmin.from('client_proposals').update({ ever_sent: true, date_sent: dateSentToday, updated_at: new Date().toISOString() }).eq('id', proposalId);
      return res.status(200).json({ sent: true, message: 'Proposal email sent' });
    }

    return res.status(503).json({
      error: 'No email provider configured',
      message: 'Configure SMTP_* or RESEND_API_KEY to send proposal emails.',
    });
  } catch (err) {
    console.error('[send-proposal-email]', err);
    return res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
}
