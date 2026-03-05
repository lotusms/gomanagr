/**
 * Send an invoice copy by email. POST body: { userId, organizationId?, invoiceId, to, clientName?, isReminder? }
 * Uses same SMTP/Resend config as send-proposal-email. Email body is HTML version of the invoice.
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { renderDocumentToHtml } from '@/lib/renderDocumentToHtml';
import { buildInvoiceDocumentPayload } from '@/lib/buildDocumentPayload';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, organizationId, invoiceId, to, clientName: clientNameBody, isReminder } = req.body || {};
  if (!userId || !invoiceId || !to || !String(to).trim()) {
    return res.status(400).json({ error: 'Missing userId, invoiceId, or to (client email)' });
  }

  const toEmail = String(to).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  try {
    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('client_invoices')
      .select('*')
      .eq('id', invoiceId)
      .limit(1)
      .single();

    if (fetchErr || !invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (organizationId) {
      if (invoice.organization_id !== organizationId) return res.status(403).json({ error: 'Invoice does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (invoice.organization_id != null || invoice.user_id !== userId) return res.status(403).json({ error: 'Invoice does not belong to you' });
    }

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
    const fromName = process.env.SMTP_FROM_NAME || appName;
    const title = (invoice.invoice_title || 'Invoice').trim();
    const number = (invoice.invoice_number || '').trim();
    const subject = isReminder
      ? (number ? `Reminder: Invoice ${title} (${number})` : `Reminder: Invoice ${title}`)
      : (number ? `Invoice: ${title} (${number})` : `Invoice: ${title}`);

    let companyName = appName;
    let companyLogoUrl = '';
    let orgName = '';
    let orgLogoUrl = '';
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name, company_logo, clients, profile')
      .eq('id', invoice.user_id)
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
      : profileJson.companyAddress ? [String(profileJson.companyAddress).trim()].filter(Boolean) : [];
    const companyAddressLines = orgAddressLines.length > 0 ? orgAddressLines : profileAddressLines;
    const companyPhone = orgPhone || (profileJson.companyPhone && String(profileJson.companyPhone).trim()) || undefined;
    const companyWebsite = orgWebsite || (profileJson.companyWebsite && String(profileJson.companyWebsite).trim()) || undefined;

    let clientName = (clientNameBody && String(clientNameBody).trim()) || '';
    let clientAddressLines = [];
    if (invoice.client_id && profile?.clients && Array.isArray(profile.clients)) {
      const client = profile.clients.find((c) => c.id === invoice.client_id);
      if (client) {
        if (!clientName) clientName = (client.name || client.companyName || client.company || '').trim() || (client.firstName || client.lastName ? [client.firstName, client.lastName].filter(Boolean).join(' ') : '');
        const billing = client.billingAddress || {};
        const company = client.companyAddress || {};
        const line1 = billing.address1 || billing.address || company.address1 || company.address || '';
        const line2 = billing.address2 || company.address2 || '';
        clientAddressLines = [line1, line2].filter(Boolean);
      }
    }
    if (!clientName) clientName = toEmail;

    const docPayload = buildInvoiceDocumentPayload(invoice);

    const html = renderDocumentToHtml({
      type: 'invoice',
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
      if (!isReminder) {
        await supabaseAdmin.from('client_invoices').update({ ever_sent: true, date_sent: dateSentToday, updated_at: new Date().toISOString() }).eq('id', invoiceId);
      }
      return res.status(200).json({ sent: true, message: isReminder ? 'Reminder sent' : 'Invoice email sent' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const { error } = await resend.emails.send({ from, to: [toEmail], subject, html });
      if (error) {
        console.error('[send-invoice-email] Resend error:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
      }
      if (!isReminder) {
        await supabaseAdmin.from('client_invoices').update({ ever_sent: true, date_sent: dateSentToday, updated_at: new Date().toISOString() }).eq('id', invoiceId);
      }
      return res.status(200).json({ sent: true, message: isReminder ? 'Reminder sent' : 'Invoice email sent' });
    }

    return res.status(503).json({
      error: 'No email provider configured',
      message: 'Configure SMTP_* or RESEND_API_KEY to send invoice emails.',
    });
  } catch (err) {
    console.error('[send-invoice-email]', err);
    return res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
}
