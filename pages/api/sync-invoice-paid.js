/**
 * Syncs invoice to paid in Supabase when Stripe has a succeeded PaymentIntent for it.
 * Two callers:
 * 1) GET with query invoiceId, token — customer landing on pay page after payment (return_url with ?paid=1).
 * 2) POST with body { invoiceId, userId, organizationId? } — org admin opening the edit page; verifies access then syncs.
 * If the stored stripe_payment_intent_id is not succeeded, searches Stripe for any succeeded PI with metadata.invoice_id
 * (handles multiple PIs / customer paid a different attempt).
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

async function findSucceededPaymentIntentForInvoice(stripe, invoiceId, invoiceRow) {
  const piId = invoiceRow?.stripe_payment_intent_id && String(invoiceRow.stripe_payment_intent_id).trim();
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      if (pi.status === 'succeeded') return pi;
    } catch (_) {}
  }
  const list = await stripe.paymentIntents.list({ limit: 100 });
  const match = list.data.find(
    (pi) => pi.metadata?.invoice_id === invoiceId && pi.status === 'succeeded'
  );
  return match || null;
}

export default async function handler(req, res) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith('sk_') || !supabaseAdmin) {
    return res.status(503).json({ ok: false, error: 'Service unavailable' });
  }

  let invoiceId = null;
  let invoice = null;

  if (req.method === 'GET') {
    const { token } = req.query || {};
    invoiceId = req.query?.invoiceId;
    if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ ok: false, error: 'Missing invoiceId or token' });
    }
    const { data, error } = await supabaseAdmin
      .from('client_invoices')
      .select('id, payment_token, stripe_payment_intent_id, status')
      .eq('id', invoiceId)
      .limit(1)
      .single();
    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }
    if (data.payment_token !== token.trim()) {
      return res.status(403).json({ ok: false, error: 'Invalid link' });
    }
    invoice = data;
  } else if (req.method === 'POST') {
    res.setHeader('Allow', 'GET, POST');
    const { userId, organizationId } = req.body || {};
    invoiceId = req.body?.invoiceId;
    if (!invoiceId || !userId) {
      return res.status(400).json({ ok: false, error: 'Missing invoiceId or userId' });
    }
    if (organizationId) {
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
    }
    let query = supabaseAdmin
      .from('client_invoices')
      .select('id, payment_token, stripe_payment_intent_id, status')
      .eq('id', invoiceId)
      .limit(1);
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }
    invoice = data;
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (invoice.status === 'paid') {
    return res.status(200).json({ ok: true, alreadyPaid: true });
  }

  try {
    const stripe = new Stripe(secretKey);
    const pi = await findSucceededPaymentIntentForInvoice(stripe, invoiceId, invoice);
    if (!pi) {
      return res.status(200).json({ ok: true, synced: false });
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatePayload = {
      status: 'paid',
      outstanding_balance: '0',
      paid_date: today,
      updated_at: new Date().toISOString(),
    };
    if (pi.id !== (invoice.stripe_payment_intent_id || '').trim()) {
      updatePayload.stripe_payment_intent_id = pi.id;
    }
    const { error: updateError } = await supabaseAdmin
      .from('client_invoices')
      .update(updatePayload)
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[sync-invoice-paid] Failed to update Supabase client_invoices:', invoiceId, updateError);
      return res.status(500).json({ ok: false, error: 'Failed to update invoice' });
    }

    console.log('[sync-invoice-paid] Supabase client_invoices updated to paid:', invoiceId);
    return res.status(200).json({ ok: true, synced: true });
  } catch (err) {
    console.error('[sync-invoice-paid]', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong' });
  }
}
