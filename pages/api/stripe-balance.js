/**
 * Returns Stripe account balance (available and pending) for the platform.
 * POST body: { userId }. Requires Stripe to be configured.
 * Response: { availableCents, pendingCents, currency, livemode } for the primary currency (USD).
 */

import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/getStripeConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeConfig = await getStripeConfig();
  const secretKey = stripeConfig.secretKey;
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const { userId } = req.body || {};
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const stripe = new Stripe(secretKey);
    const [balance, pendingPayouts] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.payouts.list({ status: 'pending', limit: 10 }),
    ]);

    const available = balance.available || [];
    const pending = balance.pending || [];
    const instantAvailable = balance.instant_available || [];
    const usdAvailable = available.find((b) => b.currency === 'usd');
    const usdPending = pending.find((b) => b.currency === 'usd');
    const usdInstantAvailable = instantAvailable.find((b) => b.currency === 'usd');
    const currency = (usdAvailable || usdPending || available[0] || pending[0])?.currency || 'usd';
    const availableCents = (usdAvailable || available.find((b) => b.currency === currency))?.amount ?? 0;
    const pendingCents = (usdPending || pending.find((b) => b.currency === currency))?.amount ?? 0;
    const instantAvailableCents = (usdInstantAvailable || instantAvailable.find((b) => b.currency === currency))?.amount ?? 0;

    let upcomingPayoutArrivalDate = null;
    if (pendingPayouts.data?.length > 0) {
      const earliest = pendingPayouts.data.reduce((min, p) => {
        const t = p.arrival_date ?? 0;
        return t > 0 && (min === null || t < min) ? t : min;
      }, null);
      if (earliest != null) {
        upcomingPayoutArrivalDate = new Date(earliest * 1000).toISOString();
      }
    }

    return res.status(200).json({
      availableCents,
      pendingCents,
      currency,
      livemode: balance.livemode === true,
      upcomingPayoutArrivalDate,
      instantAvailableCents,
    });
  } catch (err) {
    console.error('[stripe-balance]', err);
    if (err.code === 'STRIPE_ERROR') {
      return res.status(502).json({ error: 'Payment provider error', details: err.message });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
