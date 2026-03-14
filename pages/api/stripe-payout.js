/**
 * Creates a Stripe payout to the account's default bank (releases funds from Stripe to bank).
 * POST body: { userId, amountCents?, organizationId? }. When organizationId is set, uses that org's Stripe.
 * If amountCents omitted, pays out full available balance.
 */

import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/getStripeConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orgId = (req.body?.organizationId != null && String(req.body.organizationId).trim()) ? String(req.body.organizationId).trim() : null;
  const stripeConfig = await getStripeConfig(orgId);
  const secretKey = stripeConfig.secretKey;
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const { userId, amountCents, instant } = req.body || {};
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const useInstant = instant === true;

  try {
    const stripe = new Stripe(secretKey);
    const balance = await stripe.balance.retrieve();

    const available = balance.available || [];
    const usdAvailable = available.find((b) => b.currency === 'usd');
    const availableCents = usdAvailable?.amount ?? 0;

    if (availableCents <= 0) {
      return res.status(400).json({ error: 'No balance available to transfer' });
    }

    const payoutAmount =
      typeof amountCents === 'number' && amountCents > 0
        ? Math.min(Math.round(amountCents), availableCents)
        : availableCents;

    if (payoutAmount <= 0) {
      return res.status(400).json({ error: 'Payout amount must be greater than zero' });
    }

    const payout = await stripe.payouts.create({
      amount: payoutAmount,
      currency: 'usd',
      method: useInstant ? 'instant' : 'standard',
      description: useInstant ? 'GoManagr instant payout' : 'GoManagr payout',
    });

    return res.status(200).json({
      payout: {
        id: payout.id,
        status: payout.status,
        amount: payout.amount,
        currency: payout.currency,
        arrival_date: payout.arrival_date,
      },
    });
  } catch (err) {
    console.error('[stripe-payout]', err);
    if (err.code === 'STRIPE_ERROR') {
      const message = err.raw?.message || err.message;
      if (message && message.toLowerCase().includes('instant')) {
        return res.status(400).json({ error: 'Instant payouts are not enabled; use standard payout.' });
      }
      if (err.code === 'balance_insufficient') {
        return res.status(400).json({ error: 'Insufficient balance to transfer' });
      }
      return res.status(502).json({ error: 'Payment provider error', details: message });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
