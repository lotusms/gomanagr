/**
 * Public payment page. Client lands here from the "Pay now" link in the invoice email.
 * Requires ?token=... to match client_invoices.payment_token.
 * Styled to match the GoManagr app (logo, primary colors, card layout).
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

function formatMoney(value, currency = 'USD') {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function PayPageLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo href="/" variant="inline" inlineClassName="h-10" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Secure payment</span>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}

export default function PayInvoicePage() {
  const router = useRouter();
  const { invoiceId, token } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <>
      <Head>
        <title>Pay invoice - {appName}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <PayPageLayout>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{invoice.title}</h1>
            {invoice.number && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Invoice #{invoice.number}</p>
            )}
          </div>
          <div className="px-6 py-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount due</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {formatMoney(invoice.amountDue, invoice.currency)}
            </p>
          </div>
          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div className="px-6 pb-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {invoice.lineItems.slice(0, 5).map((item, i) => (
                  <li key={i}>{item.item_name || 'Item'}</li>
                ))}
                {invoice.lineItems.length > 5 && (
                  <li className="text-gray-500">…and {invoice.lineItems.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          <div className="px-6 pb-6">
            <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 p-4">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Card payment will be available here once Stripe is connected. See{' '}
                <code className="text-xs bg-primary-100 dark:bg-primary-800/50 px-1.5 py-0.5 rounded">
                  docs/PAYMENT_INTEGRATION.md
                </code>{' '}
                to complete setup.
              </p>
            </div>
          </div>
        </div>
      </PayPageLayout>
    </>
  );
}
