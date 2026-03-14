/**
 * Public payment page. Client lands here from the "Pay now" link in the invoice email.
 * Requires ?token=... to match client_invoices.payment_token.
 * Layout and styling match the print/email invoice. Payment form is embedded (Stripe Payment Element).
 *
 * DO NOT REVERT: The card form MUST autoload when the invoice loads. We create the PaymentIntent
 * in a useEffect (one request per mount). We show "Loading payment form…" then the form.
 * NEVER show a "Pay now" or "Pay with card" button that the user must click to reveal the form.
 * The API reuses an existing PaymentIntent per invoice so viewing does not create new Incompletes.
 */

import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { getStripeConfig } from '@/lib/getStripeConfig';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Logo from '@/components/Logo';

const LottiePlayer = dynamic(
  () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
  { ssr: false }
);

const LOOP_COUNT = 3;

function FireworksLoopThree({ style }) {
  const [loopsDone, setLoopsDone] = useState(false);
  const loopCountRef = useRef(0);
  const handleEvent = useCallback((event) => {
    if (event === 'loop') {
      loopCountRef.current += 1;
      if (loopCountRef.current >= LOOP_COUNT) setLoopsDone(true);
    }
  }, []);
  if (loopsDone) return <div style={style} aria-hidden="true" />;
  return (
    <LottiePlayer
      src={LOTTIE_FIREWORKS_URL}
      autoplay
      loop
      keepLastFrame={false}
      onEvent={handleEvent}
      style={style}
      renderer="svg"
    />
  );
}

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

export async function getServerSideProps() {
  const config = await getStripeConfig();
  return { props: { stripePublishableKey: config.publishableKey || '' } };
}
// Fireworks from LottieFiles – file in public/Fireworks.json (served as /Fireworks.json)
const LOTTIE_FIREWORKS_URL = '/Fireworks.json';

// Match ProposalInvoiceDocument colors
const BORDER_COLOR = '#1e3a5f';

function formatMoney(value, currency = 'USD') {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)
    ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : value;
}

function PayPageLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo href="/" variant="inline" inlineClassName="h-16" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Secure payment</span>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}

// Separate card fields (number, expiry, CVC). No Bank tab. Success flow unchanged: redirect to return_url → ?paid=1 → sync + webhook.
const cardFieldStyle = {
  base: { fontSize: '16px', color: '#1f2937', '::placeholder': { color: '#9ca3af' } },
  invalid: { color: '#dc2626' },
};

function CardPaymentForm({ clientSecret, returnUrl, onError, onTerminalStateError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const submittedRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret || submittedRef.current) return;
    const name = cardholderName.trim();
    const zip = billingZip.trim();
    if (!name) {
      onError?.('Please enter the cardholder name.');
      return;
    }
    if (!zip) {
      onError?.('Please enter the billing ZIP code.');
      return;
    }
    const cardNumberEl = elements.getElement(CardNumberElement);
    if (!cardNumberEl) {
      onError?.('Card fields not ready');
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    onError('');
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberEl,
          billing_details: {
            name,
            address: { postal_code: zip },
          },
        },
        return_url: returnUrl,
      });
      if (confirmError) {
        onError(confirmError.message || 'Payment failed');
        submittedRef.current = false;
        // PaymentIntent may already be succeeded (e.g. reused cached client_secret). Clear it so user can get a fresh PI.
        onTerminalStateError?.();
      } else if (paymentIntent?.status === 'succeeded') {
        window.location.href = returnUrl;
      }
    } catch (err) {
      onError?.(err?.message || 'Payment failed');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="space-y-3">
        <div>
          <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder name</label>
          <input
            id="cardholder-name"
            type="text"
            required
            placeholder="Name on card"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoComplete="cc-name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card number</label>
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
            <CardNumberElement
              options={{ style: cardFieldStyle }}
              onChange={(e) => {
                if (e?.error?.message?.includes('terminal state') || e?.error?.message?.includes('cannot be used')) {
                  onTerminalStateError?.();
                }
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry</label>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
              <CardExpiryElement options={{ style: cardFieldStyle }} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVC</label>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
              <CardCvcElement options={{ style: cardFieldStyle }} />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="billing-zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing ZIP code</label>
          <input
            id="billing-zip"
            type="text"
            required
            placeholder="ZIP / Postal code"
            value={billingZip}
            onChange={(e) => setBillingZip(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoComplete="postal-code"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || submitting || !cardholderName.trim() || !billingZip.trim()}
        className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        {submitting ? 'Processing…' : 'Pay with card'}
      </button>
    </form>
  );
}

function EmbeddedPaymentSection({ stripePromise, clientSecret, returnUrl, onError, onTerminalStateError }) {
  if (!stripePromise || !clientSecret) return null;
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { borderRadius: '8px' },
    },
  };
  return (
    <Elements stripe={stripePromise} options={options}>
      <CardPaymentForm clientSecret={clientSecret} returnUrl={returnUrl} onError={onError} onTerminalStateError={onTerminalStateError} />
    </Elements>
  );
}

export default function PayInvoicePage({ stripePublishableKey: stripePublishableKeyProp = '' }) {
  const stripePublishableKey = stripePublishableKeyProp;
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey]
  );

  const router = useRouter();
  const { invoiceId, token } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [intentError, setIntentError] = useState('');
  const [intentLoading, setIntentLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('');
  const [amountToPay, setAmountToPay] = useState(null);
  const intentRequestedRef = useRef(false);

  // When Stripe reports terminal state (e.g. PI already succeeded), clear form so user can request a fresh PI.
  const handleTerminalStateError = useCallback(() => {
    intentRequestedRef.current = false;
    setClientSecret(null);
  }, []);

  const maxAmount = invoice?.amountDue != null ? Number(invoice.amountDue) : 0;
  const handleAmountChange = useCallback((e) => {
    const raw = e.target.value;
    const n = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
    if (raw === '' || Number.isNaN(n)) {
      setAmountToPay(null);
      setClientSecret(null);
      intentRequestedRef.current = false;
      return;
    }
    const clamped = Math.max(0.01, Math.min(maxAmount, n));
    setAmountToPay(clamped);
    setClientSecret(null);
    intentRequestedRef.current = false;
  }, [maxAmount]);

  // Create PaymentIntent only when user clicks "Continue to payment". Always call the API (no cache) so we never reuse a PI that already succeeded.
  const handleContinueToPayment = useCallback(() => {
    if (!invoiceId || !token || !invoice || invoice.alreadyPaid || amountToPay == null || amountToPay <= 0) return;
    if (intentRequestedRef.current) return;
    intentRequestedRef.current = true;
    setIntentError('');
    setIntentLoading(true);
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, token, amount: amountToPay }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setIntentError(data.error || 'Could not load payment form');
          intentRequestedRef.current = false;
        }
      })
      .catch(() => {
        setIntentError('Could not load payment form');
        intentRequestedRef.current = false;
      })
      .finally(() => setIntentLoading(false));
  }, [invoiceId, token, invoice, amountToPay]);

  const clearPaymentError = useCallback(() => {
    setError('');
    setIntentError('');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && invoiceId && token) {
      setReturnUrl(`${window.location.origin}/pay/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(token)}&paid=1`);
    }
  }, [invoiceId, token]);

  useEffect(() => {
    if (!invoiceId || !token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/get-invoice-for-pay?invoiceId=${encodeURIComponent(invoiceId)}&token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok && data?.error) {
          setError(data.error);
          setInvoice(null);
          return;
        }
        if (data?.ok && data?.invoice) {
          const inv = data.invoice;
          setInvoice(inv);
          const doc = inv.document || {};
          const total = typeof doc.total === 'number' ? doc.total : parseFloat(String(inv.total || 0).replace(/[^\d.-]/g, '')) || 0;
          const due = doc.amountDue != null ? Number(doc.amountDue) : (inv.amountDue != null ? Number(inv.amountDue) : total);
          setAmountToPay(due);
          setError('');
        } else {
          setError(data?.error || 'Invoice not found');
          setInvoice(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Something went wrong');
          setInvoice(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [invoiceId, token]);

  const paymentSuccess = router.query.paid === '1' || router.query.redirect_status === 'succeeded';
  const syncRequestedRef = useRef(false);

  // When Stripe redirects the customer here after payment (return_url has ?paid=1), sync invoice to paid in Supabase
  // if the webhook did not run. The org admin never visits this URL; they see paid status on the invoices list and
  // when opening the invoice at /dashboard/invoices/[id]/edit (data-driven, no ?paid=1 needed).
  useEffect(() => {
    if (!paymentSuccess || !invoiceId || !token || syncRequestedRef.current) return;
    syncRequestedRef.current = true;
    const url = `/api/sync-invoice-paid?invoiceId=${encodeURIComponent(invoiceId)}&token=${encodeURIComponent(token)}`;
    fetch(url)
      .then((res) => res.json())
      .then(() => {})
      .catch(() => {});
  }, [paymentSuccess, invoiceId, token]);

  if (!invoiceId || !token) {
    return (
      <>
        <Head><title>Invalid link - {appName}</title></Head>
        <PayPageLayout>
          <div className="w-full max-w-md text-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
            <p className="text-gray-600 dark:text-gray-400">Invalid payment link. Use the link from your invoice email.</p>
          </div>
        </PayPageLayout>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Head><title>Loading - {appName}</title></Head>
        <PayPageLayout>
          <div className="w-full max-w-md text-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        </PayPageLayout>
      </>
    );
  }

  // Only show generic error when invoice failed to load. Payment errors (e.g. card declined) use the sad card below.
  if (!invoice) {
    return (
      <>
        <Head><title>Error - {appName}</title></Head>
        <PayPageLayout>
          <div className="w-full max-w-md text-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
            <p className="text-red-600 dark:text-red-400">{error || 'Invoice not found'}</p>
          </div>
        </PayPageLayout>
      </>
    );
  }

  if (paymentSuccess) {
    return (
      <>
        <Head><title>Payment successful - {appName}</title></Head>
        <PayPageLayout>
          {/* Fireworks at page level – full viewport, loop 3 times then stop */}
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0">
            <FireworksLoopThree style={{ height: '100vh', width: '100vw', minHeight: '100%', minWidth: '100%' }} />
          </div>
          <div className="relative z-10 w-full max-w-lg mx-auto text-center">
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/30 dark:to-gray-800 p-8 sm:p-10 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-800/50 mb-6">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Thank you!</h1>
              <p className="text-gray-700 dark:text-gray-300 mb-1">Your payment was successful.</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A receipt has been sent to your email. Your payment has been recorded.
              </p>
            </div>
          </div>
        </PayPageLayout>
      </>
    );
  }

  if (invoice.alreadyPaid) {
    return (
      <>
        <Head><title>Invoice paid - {appName}</title></Head>
        <PayPageLayout>
          {/* Fireworks at page level – full viewport, loop 3 times then stop */}
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0">
            <FireworksLoopThree style={{ height: '100vh', width: '100vw', minHeight: '100%', minWidth: '100%' }} />
          </div>
          <div className="relative z-10 w-full max-w-lg mx-auto text-center">
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/30 dark:to-gray-800 p-8 sm:p-10 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-800/50 mb-6">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Invoice paid</h1>
              <p className="text-gray-600 dark:text-gray-400">This invoice has already been paid. Thank you.</p>
            </div>
          </div>
        </PayPageLayout>
      </>
    );
  }

  // Payment failed / decline: same layout as thank you page but "sad" (red/rose theme, X icon, Try again).
  const paymentErrorMessage = intentError || error;
  const showPaymentFailedCard = Boolean(paymentErrorMessage);

  if (showPaymentFailedCard) {
    return (
      <>
        <Head><title>Payment failed - {appName}</title></Head>
        <PayPageLayout>
          <div className="relative z-10 w-full max-w-lg mx-auto text-center">
            <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-gradient-to-b from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 p-8 sm:p-10 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-6">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment failed</h1>
              <p className="text-red-600 dark:text-red-400 font-medium mb-1">{paymentErrorMessage}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                You can try again with a different card or payment method.
              </p>
              <button
                type="button"
                onClick={clearPaymentError}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </PayPageLayout>
      </>
    );
  }

  const doc = invoice.document || {};
  const client = invoice.client || {};
  const clientName = (client.name && String(client.name).trim()) || 'Customer';
  const clientAddressLines = Array.isArray(client.addressLines) ? client.addressLines : [];
  const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : invoice.lineItems || [];
  const currency = invoice.currency || 'USD';

  // Totals: use document payload, fallback to computed from lineItems / invoice
  let subtotal = typeof doc.subtotal === 'number' && !Number.isNaN(doc.subtotal) ? doc.subtotal : null;
  if (subtotal == null && lineItems.length > 0) {
    subtotal = lineItems.reduce((sum, row) => {
      const amt = row.amount != null ? parseFloat(String(row.amount).replace(/[^\d.-]/g, '')) : (parseFloat(String(row.quantity).replace(/[^\d.-]/g, '')) || 0) * (parseFloat(String(row.unit_price).replace(/[^\d.-]/g, '')) || 0);
      return sum + (Number.isNaN(amt) ? 0 : amt);
    }, 0);
  }
  subtotal = subtotal ?? 0;
  const taxNum = typeof doc.tax === 'number' && !Number.isNaN(doc.tax) ? doc.tax : 0;
  const discountNum = typeof doc.discount === 'number' && !Number.isNaN(doc.discount) ? doc.discount : 0;
  const total = (typeof doc.total === 'number' && !Number.isNaN(doc.total) ? doc.total : null) ?? (typeof invoice.total === 'number' ? invoice.total : parseFloat(String(invoice.total || 0).replace(/[^\d.-]/g, '')) || 0);
  const amountDue = doc.amountDue != null ? Number(doc.amountDue) : (invoice.amountDue != null ? Number(invoice.amountDue) : total);

  return (
    <>
      <Head>
        <title>Pay invoice - {appName}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <PayPageLayout>
        {/* Invoice document: same structure as print/email */}
        <div
          className="w-full max-w-3xl rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          style={{ borderWidth: 3, borderColor: BORDER_COLOR, borderStyle: 'solid' }}
        >
          <div className="p-4 sm:p-6">
            {/* Bill to (customer info) | Invoice number, dates, amount due */}
            <div className="flex flex-wrap justify-between gap-5 mb-5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Bill to</div>
                <div className="font-semibold text-gray-900 dark:text-white">{clientName}</div>
                {clientAddressLines.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                    {clientAddressLines.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                )}
                {client.email && <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{client.email}</div>}
                {client.contactName && String(client.contactName).trim() !== clientName && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{client.contactName}</div>
                )}
              </div>
              <div className="text-right flex-1 min-w-0">
                <div className="mb-1 text-sm">
                  <strong>Invoice number:</strong> {doc.number || invoice.number || '—'}
                </div>
                {doc.dateIssued && (
                  <div className="mb-0.5 text-sm"><strong>Invoice date:</strong> {formatDate(doc.dateIssued)}</div>
                )}
                {doc.dueDate && (
                  <div className="mb-0.5 text-sm"><strong>Payment due:</strong> {formatDate(doc.dueDate)}</div>
                )}
                <div className="mt-2 text-sm font-semibold">
                  <strong>Amount due ({currency}):</strong> {formatMoney(amountDue, currency)}
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-1">Services</div>
            <div className="border-b border-dotted border-gray-400 dark:border-gray-500 mb-2" style={{ borderColor: BORDER_COLOR }} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm table-fixed" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '23%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 border-b border-dotted font-medium" style={{ borderColor: BORDER_COLOR }}>Item</th>
                    <th className="text-right py-2 px-3 border-b border-dotted font-medium" style={{ borderColor: BORDER_COLOR }}>Qty</th>
                    <th className="text-right py-2 px-3 border-b border-dotted font-medium" style={{ borderColor: BORDER_COLOR }}>Price</th>
                    <th className="text-right py-2 px-3 border-b border-dotted font-medium" style={{ borderColor: BORDER_COLOR }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 border-b border-dotted align-top" style={{ borderColor: BORDER_COLOR }}>
                        <div className="text-gray-900 dark:text-gray-100">{row.item_name || '—'}</div>
                        {row.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.description}</div>}
                      </td>
                      <td className="py-2 px-3 border-b border-dotted text-right text-gray-900 dark:text-gray-100 tabular-nums" style={{ borderColor: BORDER_COLOR }}>
                        {row.quantity != null && row.quantity !== '' ? row.quantity : '—'}
                      </td>
                      <td className="py-2 px-3 border-b border-dotted text-right text-gray-900 dark:text-gray-100 tabular-nums" style={{ borderColor: BORDER_COLOR }}>
                        {formatMoney(row.unit_price, currency)}
                      </td>
                      <td className="py-2 px-3 border-b border-dotted text-right text-gray-900 dark:text-gray-100 tabular-nums" style={{ borderColor: BORDER_COLOR }}>
                        {formatMoney(row.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-b border-dotted my-3" style={{ borderColor: BORDER_COLOR }} />

            {/* Totals — ensure we always show numbers (0 when missing) */}
            <div className="text-right space-y-2 text-sm tabular-nums">
              <div><strong>Subtotal:</strong> {formatMoney(subtotal, currency)}</div>
              <div><strong>Discount:</strong> {formatMoney(-discountNum, currency)}</div>
              <div><strong>Tax/VAT:</strong> {formatMoney(taxNum, currency)}</div>
              <div className="text-base font-bold mt-2">Total: {formatMoney(total, currency)}</div>
            </div>

            {/* Amount to pay: default remaining balance, editable for partial payments (max = balance). */}
            <div className="mt-6 p-4 rounded-lg border bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 text-center">Pay this invoice online</p>
              <div className="mb-4">
                <label htmlFor="pay-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount to pay ({currency})
                </label>
                <input
                  id="pay-amount"
                  type="text" 
                  min="0.01"
                  max={maxAmount}
                  step="0.01"
                  value={amountToPay != null ? String(amountToPay) : ''}
                  onChange={handleAmountChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  aria-describedby="pay-amount-hint"
                />
                <p id="pay-amount-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum: {formatMoney(maxAmount, currency)}. You can pay the full balance or a partial amount.
                </p>
              </div>
              {stripePublishableKey ? (
                <>
                  {(intentError || error) && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">{intentError || error}</p>
                  )}
                  {clientSecret && returnUrl ? (
                    <EmbeddedPaymentSection
                      stripePromise={stripePromise}
                      clientSecret={clientSecret}
                      returnUrl={returnUrl}
                      onError={setError}
                      onTerminalStateError={handleTerminalStateError}
                    />
                  ) : amountToPay == null || amountToPay < 0.01 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enter an amount to pay (max {formatMoney(maxAmount, currency)}), then click Continue to payment.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleContinueToPayment}
                      disabled={intentLoading}
                      className="w-full mt-2 inline-flex items-center justify-center px-4 py-3 rounded-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {intentLoading ? 'Loading payment form…' : `Continue to payment — ${formatMoney(amountToPay, currency)}`}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Online card payment is not yet available for this invoice. Please contact the sender to pay by bank transfer, check, or another method.
                </p>
              )}
            </div>
          </div>
        </div>
      </PayPageLayout>
    </>
  );
}
