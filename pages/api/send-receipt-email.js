/**
 * Send a receipt (paid-invoice document) by email. POST body: { userId, organizationId?, invoiceId, to }.
 * Uses the same document design as the payment receipt email (renderDocumentToHtml type 'receipt').
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { renderDocumentToHtml } from '@/lib/renderDocumentToHtml';
import { buildInvoiceDocumentPayload } from '@/lib/buildDocumentPayload';

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

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

  const { userId, organizationId, invoiceId, to } = req.body || {};
  if (!userId || !invoiceId || !to || !String(to).trim()) {
    return res.status(400).json({ error: 'Missing userId, invoiceId, or to (recipient email)' });
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
    const invNum = invoice.invoice_number || invoiceId;
    const total = parseNum(invoice.total);
    const balance = invoice.outstanding_balance != null && String(invoice.outstanding_balance).trim() !== ''
      ? parseNum(invoice.outstanding_balance)
      : total;
    const amountPaid = total - balance;

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name, company_logo, clients, profile')
      .eq('id', invoice.user_id)
      .maybeSingle();
    const profileJson = profile?.profile && typeof profile.profile === 'object' ? profile.profile : {};
    let companyName = appName;
    let companyLogoUrl = '';
    let orgName = '';
    let orgLogoUrl = '';
    let orgAddressLines = [];
    let orgPhone = '';
    let orgWebsite = '';
    if (profile?.company_name) companyName = String(profile.company_name).trim();
    if (profile?.company_logo) companyLogoUrl = String(profile.company_logo).trim();
    if (invoice.organization_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, logo_url, address_line_1, address_line_2, city, state, postal_code, country, phone, website')
        .eq('id', invoice.organization_id)
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
    const profileAddressLines = Array.isArray(profileJson.companyAddressLines) ? profileJson.companyAddressLines.filter(Boolean) : (profileJson.companyAddress ? [String(profileJson.companyAddress).trim()].filter(Boolean) : []);
    const companyAddressLines = orgAddressLines.length > 0 ? orgAddressLines : profileAddressLines;
    let clientName = (invoice.client_snapshot?.name && String(invoice.client_snapshot.name).trim()) || 'Customer';
    let clientAddressLines = [];
    if (invoice.client_id && profile?.clients && Array.isArray(profile.clients)) {
      const client = profile.clients.find((c) => c.id === invoice.client_id);
      if (client) {
        clientName = (client.name || client.companyName || '').trim() || (client.firstName || client.lastName ? [client.firstName, client.lastName].filter(Boolean).join(' ') : '') || clientName;
        const billing = client.billingAddress || {};
        const companyAddr = client.companyAddress || {};
        const line1 = billing.address1 || billing.address || companyAddr.address1 || companyAddr.address || '';
        const line2 = billing.address2 || companyAddr.address2 || '';
        clientAddressLines = [line1, line2].filter(Boolean);
      }
    }
    if (invoice.client_snapshot?.addressLines && Array.isArray(invoice.client_snapshot.addressLines)) {
      clientAddressLines = invoice.client_snapshot.addressLines.filter(Boolean);
    }

    const docPayload = buildInvoiceDocumentPayload(invoice);
    docPayload.amountDue = balance;
    docPayload.paidDate = invoice.paid_date || null;
    const receiptHtml = renderDocumentToHtml({
      type: 'receipt',
      company: {
        name: displayName,
        ...(displayLogo && { logoUrl: displayLogo }),
        ...(companyAddressLines.length > 0 && { addressLines: companyAddressLines }),
        ...(orgPhone && { phone: orgPhone }),
        ...(orgWebsite && { website: orgWebsite }),
      },
      client: {
        name: clientName,
        email: toEmail,
        ...(clientAddressLines.length > 0 && { addressLines: clientAddressLines }),
      },
      document: docPayload,
      currency: 'USD',
      amountPaid,
    });

    const subject = `Receipt #${invNum}`;
    const fromName = process.env.SMTP_FROM_NAME || appName;
    const fromEmail = process.env.SMTP_FROM_EMAIL || '';

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    if (smtpHost && smtpUser && smtpPass && fromEmail) {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true';
      const transporter = nodemailer.createTransport({ host: smtpHost, port, secure, auth: { user: smtpUser, pass: smtpPass } });
      const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
      await transporter.sendMail({ from, to: toEmail, subject, html: receiptHtml });
      return res.status(200).json({ sent: true, message: 'Receipt email sent' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const { error } = await resend.emails.send({ from, to: [toEmail], subject, html: receiptHtml });
      if (error) {
        console.error('[send-receipt-email] Resend error:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
      }
      return res.status(200).json({ sent: true, message: 'Receipt email sent' });
    }

    return res.status(503).json({
      error: 'No email provider configured',
      message: 'Configure SMTP_* or RESEND_API_KEY to send receipt emails.',
    });
  } catch (err) {
    console.error('[send-receipt-email]', err);
    return res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
}
