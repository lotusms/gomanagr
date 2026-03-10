/**
 * Public API for the payment page. GET with query: invoiceId, token.
 * Returns minimal invoice info (title, number, amount due, currency, line items) only if token matches.
 * Used by /pay/[invoiceId] so the client can see what they're paying for.
 */

import { createClient } from '@supabase/supabase-js';

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

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { invoiceId, token } = req.query || {};
  if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Missing invoiceId or token' });
  }

  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('client_invoices')
      .select('id, invoice_title, invoice_number, total, outstanding_balance, status, payment_token, line_items')
      .eq('id', invoiceId)
      .limit(1)
      .single();

    if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.payment_token !== token.trim()) return res.status(403).json({ error: 'Invalid link' });
    if (invoice.status === 'void') return res.status(400).json({ error: 'This invoice is void' });

    const total = parseNum(invoice.total);
    const balance = invoice.outstanding_balance != null && String(invoice.outstanding_balance).trim() !== ''
      ? parseNum(invoice.outstanding_balance)
      : total;
    if (balance <= 0) {
      return res.status(200).json({
        ok: true,
        invoice: {
          id: invoice.id,
          title: invoice.invoice_title || 'Invoice',
          number: invoice.invoice_number || '',
          amountDue: 0,
          total,
          currency: 'USD',
          lineItems: Array.isArray(invoice.line_items) ? invoice.line_items : [],
          alreadyPaid: true,
        },
      });
    }

    const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
    return res.status(200).json({
      ok: true,
      invoice: {
        id: invoice.id,
        title: invoice.invoice_title || 'Invoice',
        number: invoice.invoice_number || '',
        amountDue: balance,
        total,
        currency: 'USD',
        lineItems,
        alreadyPaid: false,
      },
    });
  } catch (err) {
    console.error('[get-invoice-for-pay]', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
