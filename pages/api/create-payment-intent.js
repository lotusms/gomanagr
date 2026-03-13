/**
 * Creates or reuses a Stripe PaymentIntent for an invoice. POST body: { invoiceId, token }.
 * Returns { clientSecret } for the Payment Element.
 *
 * DO NOT REVERT: We MUST reuse an existing PaymentIntent when the invoice already has
 * stripe_payment_intent_id and it is still in requires_payment_method. Creating a new PI
 * on every call causes "Incomplete" transactions in Stripe for every page view. Always
 * check reuse first; only create when no reusable PI exists.
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

// Per-invoice lock so only one request creates a PaymentIntent; others wait and reuse. Prevents 60+ Incompletes from concurrent/remount calls.
const creationLocks = new Map();
const lockTimeoutMs = 15000;

async function withCreationLock(invoiceId, fn) {
  const existing = creationLocks.get(invoiceId);
  if (existing) {
    try {
      await Promise.race([
        existing.promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('lock_timeout')), lockTimeoutMs)),
      ]);
    } catch (_) {}
  }
  const lock = {};
  lock.promise = new Promise((resolve) => { lock.resolvePromise = resolve; });
  creationLocks.set(invoiceId, lock);
  try {
    return await fn();
  } finally {
    lock.resolvePromise();
    creationLocks.delete(invoiceId);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { invoiceId, token, amount: requestedAmount } = req.body || {};
  if (!invoiceId || !token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Missing invoiceId or token' });
  }

  try {
    const run = async () => {
      const { data: invoice, error } = await supabaseAdmin
        .from('client_invoices')
        .select('id, invoice_title, invoice_number, total, outstanding_balance, status, payment_token, stripe_payment_intent_id')
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

      // Optional partial payment: amount in dollars; clamp to (0, balance]
      let payAmount = balance;
      if (requestedAmount != null && requestedAmount !== '') {
        const parsed = parseNum(requestedAmount);
        if (parsed <= 0) return res.status(400).json({ error: 'Payment amount must be greater than zero' });
        if (parsed > balance) return res.status(400).json({ error: 'Payment amount cannot exceed the balance due' });
        payAmount = parsed;
      }

      const amountCents = Math.round(payAmount * 100);
      if (amountCents < 50) {
        return res.status(400).json({ error: 'Amount due is too small to pay by card' });
      }

      const stripe = new Stripe(secretKey);

      // Card only: use config if set so Payment Element only shows card (no bank).
      const cardOnlyConfigId = process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID?.trim() || '';

      // Reuse existing PaymentIntent only when it's still usable and card-only (or created with our card-only config).
      const existingPiId = invoice.stripe_payment_intent_id && String(invoice.stripe_payment_intent_id).trim();
      if (existingPiId && !cardOnlyConfigId) {
        try {
          const existing = await stripe.paymentIntents.retrieve(existingPiId);
          const onlyCard = Array.isArray(existing.payment_method_types) && existing.payment_method_types.length === 1 && existing.payment_method_types[0] === 'card';
          if (existing.status === 'requires_payment_method' && existing.amount === amountCents && onlyCard) {
            return res.status(200).json({ clientSecret: existing.client_secret });
          }
        } catch (_) {
          // PI not found or invalid; fall through to create new
        }
      }
      if (existingPiId && cardOnlyConfigId) {
        try {
          const existing = await stripe.paymentIntents.retrieve(existingPiId);
          const sameConfig = existing.payment_method_configuration === cardOnlyConfigId;
          if (existing.status === 'requires_payment_method' && existing.amount === amountCents && sameConfig) {
            return res.status(200).json({ clientSecret: existing.client_secret });
          }
        } catch (_) {}
      }

      // No reusable PI: create one and save.
      const createParams = {
        amount: amountCents,
        currency: 'usd',
        metadata: { invoice_id: invoiceId },
      };
      if (cardOnlyConfigId) {
        createParams.automatic_payment_methods = { enabled: true };
        createParams.payment_method_configuration = cardOnlyConfigId;
      } else {
        createParams.automatic_payment_methods = { enabled: false };
        createParams.payment_method_types = ['card'];
      }
      const paymentIntent = await stripe.paymentIntents.create(createParams);

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('client_invoices')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .is('stripe_payment_intent_id', null)
        .select('id, stripe_payment_intent_id')
        .maybeSingle();

      if (updateError || !updated) {
        const { data: row } = await supabaseAdmin
          .from('client_invoices')
          .select('stripe_payment_intent_id')
          .eq('id', invoiceId)
          .single();
        const currentPiId = row?.stripe_payment_intent_id && String(row.stripe_payment_intent_id).trim();
        if (currentPiId) {
          try {
            const current = await stripe.paymentIntents.retrieve(currentPiId);
            const currentOnlyCard = Array.isArray(current.payment_method_types) && current.payment_method_types.length === 1 && current.payment_method_types[0] === 'card';
            const currentSameConfig = cardOnlyConfigId && current.payment_method_configuration === cardOnlyConfigId;
            if (current.status === 'requires_payment_method' && current.amount === amountCents && (currentOnlyCard || currentSameConfig)) {
              return res.status(200).json({ clientSecret: current.client_secret });
            }
          } catch (_) {}
          await supabaseAdmin
            .from('client_invoices')
            .update({
              stripe_payment_intent_id: paymentIntent.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);
        }
      }

      return res.status(200).json({ clientSecret: paymentIntent.client_secret });
    };

    await withCreationLock(invoiceId, run);
  } catch (err) {
    console.error('[create-payment-intent]', err);
    if (err.code === 'STRIPE_ERROR') {
      return res.status(502).json({ error: 'Payment provider error', details: err.message });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
