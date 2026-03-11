/**
 * Creates a Stripe PaymentIntent for an invoice. POST body: { invoiceId, token }.
 * Used when the payment form is embedded on our page (Payment Element). Returns { clientSecret }.
 */

import Stripe from 'stripe';
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { invoiceId, token } = req.body || {};
  if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Missing invoiceId or token' });
  }

  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('client_invoices')
      .select('id, invoice_title, invoice_number, total, outstanding_balance, status, payment_token')
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
      return res.status(400).json({ error: 'This invoice is already paid' });
    }

    const amountCents = Math.round(balance * 100);
    if (amountCents < 50) {
      return res.status(400).json({ error: 'Amount due is too small to pay by card' });
    }

    const stripe = new Stripe(secretKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        invoice_id: invoiceId,
      },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[create-payment-intent]', err);
    if (err.code === 'STRIPE_ERROR') {
      return res.status(502).json({ error: 'Payment provider error', details: err.message });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
