/**
 * Public payment page. Client lands here from the "Pay now" link in the invoice email.
 * Requires ?token=... to match client_invoices.payment_token.
 * Shows invoice summary; Stripe Checkout or Payment Element can be wired here later.
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';

function formatMoney(value, currency = 'USD') {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
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
      .catch((err) => {
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>Invalid payment link. Use the link from your invoice email.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading…</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', color: '#b91c1c' }}>{error || 'Invoice not found'}</div>
      </div>
    );
  }

  if (invoice.alreadyPaid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Invoice paid</h1>
          <p style={{ color: '#6b7280' }}>This invoice has already been paid. Thank you.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 24 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>{invoice.title}</h1>
        {invoice.number && <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 16 }}>Invoice #{invoice.number}</p>}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Amount due</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{formatMoney(invoice.amountDue, invoice.currency)}</p>
        </div>
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <ul style={{ marginTop: 16, paddingLeft: 20, color: '#4b5563', fontSize: '0.875rem' }}>
            {invoice.lineItems.slice(0, 5).map((item, i) => (
              <li key={i}>{item.item_name || 'Item'}</li>
            ))}
            {invoice.lineItems.length > 5 && <li>…and {invoice.lineItems.length - 5} more</li>}
          </ul>
        )}
        <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: '0.875rem', color: '#64748b' }}>
          <p style={{ margin: 0 }}>Card payment will be available here once Stripe is connected. See <strong>docs/PAYMENT_INTEGRATION.md</strong> to complete setup.</p>
        </div>
      </div>
    </div>
  );
}
