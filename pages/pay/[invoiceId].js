/**
 * Public payment page. Client lands here from the "Pay now" link in the invoice email.
 * Requires ?token=... to match client_invoices.payment_token.
 * Layout and styling match the print/email invoice. Payment form is embedded (Stripe Payment Element).
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Logo from '@/components/Logo';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

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

function PaymentForm({ returnUrl, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    onError('');
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (confirmError) {
      onError(confirmError.message || 'Payment failed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}

function EmbeddedPaymentSection({ clientSecret, returnUrl, onError }) {
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
      <PaymentForm returnUrl={returnUrl} onError={onError} />
    </Elements>
  );
}

export default function PayInvoicePage() {
  const router = useRouter();
  const { invoiceId, token } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [intentError, setIntentError] = useState('');
  const [intentLoading, setIntentLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
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
          setInvoice(data.invoice);
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

  const handlePayWithCardClick = () => {
    if (!invoiceId || !token || intentLoading || clientSecret) return;
    setIntentError('');
    setIntentLoading(true);
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, token }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
          setShowPaymentForm(true);
        } else {
          setIntentError(data.error || 'Could not load payment form');
        }
      })
      .catch(() => setIntentError('Could not load payment form'))
      .finally(() => setIntentLoading(false));
  };

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

  if (error || !invoice) {
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

  const paymentSuccess = router.query.paid === '1' || router.query.redirect_status === 'succeeded';
  if (paymentSuccess) {
    return (
      <>
        <Head><title>Payment successful - {appName}</title></Head>
        <PayPageLayout>
          <div className="w-full max-w-md text-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Thank you!</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Your payment was successful.</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A receipt has been sent to your email. This invoice is now marked as paid.
            </p>
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
          <div className="w-full max-w-md text-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Invoice paid</h1>
            <p className="text-gray-600 dark:text-gray-400">This invoice has already been paid. Thank you.</p>
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

            {/* Embedded payment form: create PaymentIntent only when user clicks Pay with card (avoids multiple Stripe transactions) */}
            <div className="mt-6 p-4 rounded-lg border bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pay this invoice online</p>
              {stripePublishableKey ? (
                <>
                  {intentError && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">{intentError}</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
                  )}
                  {clientSecret && returnUrl ? (
                    <EmbeddedPaymentSection
                      clientSecret={clientSecret}
                      returnUrl={returnUrl}
                      onError={setError}
                    />
                  ) : intentLoading ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading payment form…</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePayWithCardClick}
                      disabled={intentLoading}
                      className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      Pay with card
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
