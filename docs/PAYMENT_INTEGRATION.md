# Payment Processing Integration (Wave-style, free to run)

This guide describes how to add Wave-style payment processing to GoManagr with **no monthly fee**, using **Stripe** (you only pay per transaction: ~2.9% + 30¢ per successful charge).

## Flow overview

1. **User sends invoice** to client via email (existing flow).
2. **Invoice email** includes a **“Pay now” link** that points to GoManagr’s payment page.
3. **Client clicks the link** → lands on a **public** GoManagr payment page (no login).
4. **Client enters card** and clicks Pay → payment is processed (Stripe).
5. **Payment** is recorded and appears in a **Payout** screen.
6. **Payout**: Payment sits in “Payout” for **3 days**, then transfers to the **invoice owner’s bank** (stored in profile/settings; bank details not implemented yet).
7. **Instant payout**: Optional “Transfer now” for a fee (e.g. Stripe instant payouts).

---

## 1. Free way: Stripe (no monthly fee)

- **Stripe**: No monthly fee. You pay **2.9% + 30¢** per successful card charge (US). No setup fee.
- **Stripe Payment Links** and **Checkout** have no extra cost beyond that.
- **Payouts**: Stripe automatically pays your **Stripe balance** to your connected bank on a schedule (e.g. 2-day rolling). “3-day hold” and “instant for a fee” can be implemented with your own **payouts** table and Stripe’s **payout** or **instant payout** APIs.

### Alternatives (also no monthly fee)

- **PayPal Invoicing**: No monthly fee; similar flow (invoice → link → pay). You pay per transaction.
- **Square Invoices**: No monthly fee; payment links and card processing.

Stripe is recommended for flexibility (payment links, Checkout, API, webhooks, future bank/payout logic).

---

## 2. What’s already in the app (scaffold)

- **Payment link in invoice email**: When you send an invoice, the email body can include a “Pay now” link:  
  `https://your-app.com/pay/[invoiceId]?token=[payment_token]`
- **Public pay page**: `pages/pay/[invoiceId].js` — client lands here, sees invoice summary and (once Stripe is wired) the card form.
- **Secure token**: `client_invoices.payment_token` — generated when the invoice is sent; the pay page only shows invoice details if `token` matches.

You still need to:

- Create Stripe account and add keys.
- Implement “Enter card and pay” (Stripe Checkout or Payment Element).
- Add Payout screen and 3-day / instant payout logic (and later, bank in profile).

---

## 3. Implementation steps

### 3.1 Stripe setup

1. Sign up at [stripe.com](https://stripe.com).
2. Get **API keys**: Dashboard → Developers → API keys.  
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
   - **Secret key** → `STRIPE_SECRET_KEY` (server only).
3. (Optional) **Webhook**: Developers → Webhooks → Add endpoint, e.g. `https://your-app.com/api/webhooks/stripe`.  
   Events to subscribe to: `checkout.session.completed`, `payment_intent.succeeded` (if using Payment Intents).

### 3.2 Payment when client clicks “Pay now”

Two common options:

**Option A – Stripe Checkout (simplest)**  
- Your server creates a [Checkout Session](https://docs.stripe.com/checkout/quickstart) with `line_items` from the invoice and `success_url` / `cancel_url` pointing back to your site.  
- Redirect the client to `session.url`; Stripe hosts the card form.  
- On success, Stripe redirects to your `success_url`; use the webhook `checkout.session.completed` to mark the invoice (or a new `invoice_payments` row) as paid and create a **payout** record (status “pending”, payout_date = now + 3 days).

**Option B – Payment Element (card form on your page)**  
- Your server creates a [PaymentIntent](https://docs.stripe.com/payments/accept-a-payment?platform=web&ui=payment-element).  
- Your pay page loads Stripe.js and mounts the [Payment Element](https://docs.stripe.com/payments/accept-a-payment?platform=web&ui=payment-element).  
- On success, use webhook `payment_intent.succeeded` (or client-side confirmation) to update invoice and create the same **payout** record.

Suggested flow:

1. **API route** (e.g. `pages/api/create-payment-session.js`):  
   - Input: `invoiceId`, `token` (from pay page).  
   - Validate token against `client_invoices.payment_token`.  
   - If invoice is not paid and amount due > 0: create Stripe Checkout Session (or PaymentIntent) for that amount and return `sessionId` (or `clientSecret`).  
   - If using Checkout: redirect to Stripe; if using Payment Element: return `clientSecret` so the pay page can confirm the payment.
2. **Pay page** (`pages/pay/[invoiceId].js`):  
   - Already shows invoice summary.  
   - Add “Pay with card” → call your API → either redirect to Checkout or show Payment Element and confirm.

### 3.3 Recording the payment and “Payout”

- Add a table, e.g. **`invoice_payments`** (or **`payouts`**):  
  `id`, `invoice_id`, `stripe_payment_intent_id` (or `checkout_session_id`), `amount_cents`, `currency`, `status` (‘pending_payout’ | ‘paid_out’ | ‘instant_paid_out’), `payout_scheduled_at` (e.g. now + 3 days), `paid_out_at`, `created_at`.
- When Stripe webhook fires (payment succeeded):  
  - Update invoice (e.g. `status` → paid/partially_paid, `outstanding_balance`, `paid_date`).  
  - Insert a row in `invoice_payments` with `status = 'pending_payout'` and `payout_scheduled_at = now() + 3 days`.
- **Payout screen** (new page under dashboard):  
  - List payments with `status = 'pending_payout'` (and optionally `paid_out` for history).  
  - Show “Scheduled payout: [date]” and, if you add it, “Transfer now (fee)” for instant payout.

### 3.4 3-day hold and transfer to bank

- **Automatic**: Use a cron job or serverless function that runs daily. For each `invoice_payments` row where `status = 'pending_payout'` and `payout_scheduled_at <= today`, call Stripe to create a **Payout** to your connected bank (or use Stripe Connect if payouts go to multiple accounts). Then set `status = 'paid_out'` and `paid_out_at = now()`.
- **Bank account**: Today, “client’s bank” isn’t in the app. For a first version, you can use the **Stripe account’s default bank** (Dashboard → Settings → Payouts). Later, add bank account to **user profile** (or organization settings) and, if needed, use Stripe Connect so each user/org has their own connected account.

### 3.5 Instant payout for a fee

- Stripe supports [Instant Payouts](https://docs.stripe.com/payouts/instant-payouts-bank-account) (fee per transfer, e.g. 1%).  
- In your Payout screen, add “Transfer now” for a given payment. On confirm:  
  - Call Stripe to create an instant payout for that amount (or use a transfer to a connected account then instant payout).  
  - Deduct the fee (e.g. show “Fee: $X” before confirming).  
  - Mark the payment as `instant_paid_out` and set `paid_out_at`.

---

## 4. Environment variables

```bash
# Pay link base URL: where the app (dashboard, /pay page) is hosted. If your marketing site is
# https://www.gomanagr.com and the app is at https://app.gomanagr.com, set this so "Pay now" goes to the app.
APP_BASE_URL=https://app.gomanagr.com

# Stripe (add when you implement)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # for webhook signature verification
```

---

## 5. Security

- **Pay page**: Only show invoice details and allow payment if `token` query param matches `client_invoices.payment_token`.  
- **Create session / PaymentIntent**: Always validate `invoiceId` + `token` server-side; never trust the client.  
- **Webhook**: Verify signature using `STRIPE_WEBHOOK_SECRET` and idempotency (e.g. by `stripe_payment_intent_id`) so the same event doesn’t double-apply.

---

## 6. Summary checklist

| Step | Status |
|------|--------|
| Payment link in invoice email | Scaffold in place |
| Public pay page with invoice summary | Scaffold in place |
| `payment_token` on invoice + API to fetch invoice for pay | Scaffold in place |
| Stripe account + keys | You add |
| Create Checkout Session or PaymentIntent (API) | To implement |
| Pay page: redirect to Checkout or embed Payment Element | To implement |
| Webhook: update invoice + create payout row | To implement |
| Payout screen (list pending/paid) | To implement |
| 3-day scheduled payout (cron) | To implement |
| Bank in user/client profile | Not implemented yet |
| Instant payout for a fee | To implement |

Once Stripe is wired and the webhook creates `invoice_payments` rows, the rest is UI (Payout screen) and background job (scheduled and instant payouts).
