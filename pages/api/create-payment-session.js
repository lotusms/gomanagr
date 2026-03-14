/**
 * Creates a Stripe Checkout Session for an invoice. POST body: { invoiceId, token }.
 * Validates token against client_invoices.payment_token, then creates a one-time payment session.
 * Returns { url } to redirect the client to Stripe Checkout.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripeConfig } from '@/lib/getStripeConfig';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { invoiceId, token } = req.body || {};
  if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Missing invoiceId or token' });
  }

  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('client_invoices')
      .select('id, organization_id, invoice_title, invoice_number, total, outstanding_balance, status, payment_token')
      .eq('id', invoiceId)
      .limit(1)
      .single();

    if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' });

    const stripeConfig = await getStripeConfig();
    const secretKey = stripeConfig.secretKey;
    if (!secretKey || !secretKey.startsWith('sk_')) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }
    if (invoice.payment_token !== token.trim()) return res.status(403).json({ error: 'Invalid link' });
    if (invoice.status === 'void') return res.status(400).json({ error: 'This invoice is void' });

    const total = parseNum(invoice.total);
    const balance = invoice.outstanding_balance != null && String(invoice.outstanding_balance).trim() !== ''
      ? parseNum(invoice.outstanding_balance)
      : total;
    if (balance <= 0) {
      return res.status(400).json({ error: 'This invoice is already paid' });
    }

    const amountCents = Math.round(balance * 100);
    if (amountCents < 50) {
      return res.status(400).json({ error: 'Amount due is too small to pay by card' });
    }

    const baseUrl = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const payPath = `/pay/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(token)}`;
    const successUrl = `${baseUrl}${payPath}&paid=1`;
    const cancelUrl = `${baseUrl}${payPath}`;

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: invoice.invoice_title || 'Invoice',
              description: invoice.invoice_number ? `Invoice #${invoice.invoice_number}` : undefined,
              images: undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoice_id: invoiceId,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-payment-session]', err);
    if (err.code === 'STRIPE_ERROR') {
      return res.status(502).json({ error: 'Payment provider error', details: err.message });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
