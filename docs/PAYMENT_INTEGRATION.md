# Payment Processing Integration (Wave-style, free to run)

This guide describes how to add Wave-style payment processing to GoManagr with **no monthly fee**, using **Stripe** (you only pay per transaction: ~2.9% + 30¢ per successful charge).

---

## What you need to make it work with Stripe

The pay page already shows the invoice and the “Pay this invoice online” section; the message says card payment is not available until you complete these steps:

| # | What to do |
|---|------------|
| 1 | **Stripe account + keys** — Sign up at [stripe.com](https://stripe.com), get **Publishable** and **Secret** keys from Dashboard → Developers → API keys. Add to `.env`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`. |
| 2 | **Create payment session API** — New route (e.g. `pages/api/create-payment-session.js`) that accepts `invoiceId` + `token`, validates the token, and creates a [Stripe Checkout Session](https://docs.stripe.com/checkout/quickstart) (or PaymentIntent) for the invoice amount. Return `sessionId` (for Checkout) or `clientSecret` (for Payment Element). |
| 3 | **Pay page: “Pay with card”** — Replace the “not yet available” message with a button that calls your new API, then either redirects to Stripe Checkout (`session.url`) or shows Stripe’s Payment Element and confirms with the returned `clientSecret`. |
| 4 | **Webhook** — Add `pages/api/webhooks/stripe.js` to receive `checkout.session.completed` (or `payment_intent.succeeded`). Verify signature with `STRIPE_WEBHOOK_SECRET`. On success: update the invoice (`status`, `outstanding_balance`, `paid_date`) and optionally insert into an `invoice_payments` table for payout tracking. |
| 5 | **(Optional) Payout screen** — Dashboard page to list pending/paid payments and (later) 3-day hold / instant payout. |

**Minimum to accept card payments:** Steps 1–4. After that, the “Pay this invoice online” box can show a real “Pay with card” button and complete the charge; the webhook marks the invoice as paid.

---

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
3. **Webhook (required for invoice to mark paid and send emails)**  
   - In Stripe Dashboard: **Developers → Webhooks → Add endpoint**.  
   - **Endpoint URL**: `https://your-production-domain.com/api/webhooks/stripe` (e.g. `https://gomanagr.com/api/webhooks/stripe`).  
   - **Events to send**: select `payment_intent.succeeded` (and `checkout.session.completed` if you use Checkout).  
   - After creating the endpoint, open it and reveal the **Signing secret** (starts with `whsec_`).  
   - Set **`STRIPE_WEBHOOK_SECRET`** in your production environment to that value.  
   - If this is missing or wrong, payments will succeed in Stripe but the invoice in GoManagr will **not** update (balance stays, no “paid” status), **no receipt or notification emails** will be sent, and the invoice will **not** appear on the Receipts page.

4. **Card-only (optional)**  
   The integration is configured to accept **card only** (no bank/ACH). If the Payment Element still shows a "Bank" option (e.g. due to Stripe account defaults), create a **card-only Payment Method Configuration** and point the API to it:  
   - In Stripe Dashboard: **Settings → Payment methods** (or **Developers → Payment method configurations**).  
   - Create a new configuration (e.g. "Card only"). Enable **Card** only; leave all other methods (Bank, Link, etc.) off. Save and copy the **Configuration ID** (e.g. `pmc_xxxx`).  
   - In your environment, set **`STRIPE_PAYMENT_METHOD_CONFIGURATION_ID`** (server) and **`NEXT_PUBLIC_STRIPE_PAYMENT_METHOD_CONFIGURATION_ID`** (client) to that same ID (e.g. `pmc_xxxx`). The API and the Payment Element both use it so only card is offered and Bank is hidden.

### 3.2 Payment when client clicks "Pay now"

**How the paid transaction updates the Supabase invoice**

When a payment succeeds, the **Supabase `client_invoices`** row is updated so the invoice shows as paid in GoManagr (status, balance due, date paid):

1. **Webhook** (`/api/webhooks/stripe`): On `payment_intent.succeeded`, the handler updates the invoice by `id` (from PaymentIntent metadata or `stripe_payment_intent_id`): sets `status = 'paid'`, `outstanding_balance = '0'`, `paid_date = today`, and `updated_at`. Receipt and notification emails are sent after the update.
2. **Success-page sync** (`/api/sync-invoice-paid`): Stripe redirects the **customer** to the pay page with `?paid=1` after a successful payment (our `return_url`). When that page loads, it calls this API so the invoice is updated in Supabase if the webhook did not run. The **org admin never visits that URL**; they see paid status on the Invoices list (green card) and when opening the invoice at `/dashboard/invoices/[id]/edit` (no `?paid=1`—the edit page is data-driven and shows the paid design when the invoice record has `status = 'paid'`).

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

## 5. Testing on localhost (webhooks)

Stripe cannot send webhooks to `localhost`. To test the full flow (pay → invoice marked paid → receipt):

1. **Install Stripe CLI**: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. **Log in**: `stripe login`
3. **Forward webhooks to your app**:  
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. The CLI prints a **webhook signing secret** (e.g. `whsec_...`). Put it in `.env.local` as `STRIPE_WEBHOOK_SECRET` (temporarily; use the real secret in production).
5. Run your app (`npm run dev`) and open the pay link. After a successful payment, Stripe sends the event to the CLI, which forwards it to `localhost:3000`. The webhook then updates the invoice to paid and it appears on the Receipts page.

Without this, payments succeed in Stripe but the invoice in GoManagr stays unpaid until you deploy and use a public URL for the webhook.

**Fewer “Incomplete” transactions:** The app reuses one PaymentIntent per invoice when the pay page is opened or refreshed. A new PaymentIntent is only created when there isn’t an existing one in `requires_payment_method`. That way, opening the link multiple times doesn’t create new incompletes in Stripe; only successful, declined, or other terminal states appear as separate transactions.

---

## 6. Verifying the webhook (invoice not updating / no emails)

If the invoice still shows a balance and no payment info after a successful payment, or you didn’t get receipt/notification emails:

1. **Production**: Ensure a webhook endpoint is configured in Stripe with your **production** URL and `STRIPE_WEBHOOK_SECRET` is set in production to the endpoint’s **signing secret**.
2. **Stripe Dashboard → Developers → Webhooks**: Open your endpoint and check **Recent deliveries**. A failed delivery will show a non-200 response or an error message; you can “Resend” to retry.
3. **Server logs** (e.g. Vercel): Look for `[webhooks/stripe]` messages. You should see “Processing payment for invoice: …”, “Invoice updated to paid”, and “Receipt email sent” / “Payment notification sent”. If you see “Signature verification failed”, the webhook secret doesn’t match. If you see “No email transport configured”, set SMTP or `RESEND_API_KEY` so receipt and notification emails can be sent.

---

## 7. Verifying payments in Stripe

After a client pays, you can confirm the payment reached Stripe and your app:

1. **Stripe Dashboard → Payments**  
   [dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments) (or /payments in live mode)  
   Lists all payments with amount, status, and customer. Match by amount and time to your invoice.

2. **Stripe Dashboard → Developers → Events**  
   Shows every event (e.g. `payment_intent.succeeded`). Click an event to see the payload and that the webhook was triggered.

3. **Stripe Dashboard → Developers → Webhooks**  
   Open your webhook endpoint and check **Recent deliveries**. A successful delivery has a 200 response; you can resend or view the request/response.

4. **Your app**  
   The webhook updates the invoice to `status: paid` and `outstanding_balance: 0`. In your dashboard, the invoice should show as paid. The customer receives a receipt email and the invoice owner (or org superadmin) receives a payment notification email.

---

## 8. Security

- **Pay page**: Only show invoice details and allow payment if `token` query param matches `client_invoices.payment_token`.  
- **Create session / PaymentIntent**: Always validate `invoiceId` + `token` server-side; never trust the client.  
- **Webhook**: Verify signature using `STRIPE_WEBHOOK_SECRET` and idempotency (e.g. by `stripe_payment_intent_id`) so the same event doesn’t double-apply.

---

## 9. Summary checklist

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
