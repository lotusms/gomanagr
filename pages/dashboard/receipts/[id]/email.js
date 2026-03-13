import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';

export default function EmailReceiptPage() {
  const router = useRouter();
  const { id: receiptId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((account) => setUserAccount(account || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !receiptId) return;
    setLoading(true);
    setError('');
    fetch('/api/get-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        invoiceId: receiptId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.invoice) {
          const inv = data.invoice;
          setInvoice(inv);
          const snapshotEmail = inv.client_snapshot?.email && String(inv.client_snapshot.email).trim();
          if (snapshotEmail) setClientEmail(snapshotEmail);
        }
      })
      .catch(() => setError('Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, receiptId, organization?.id]);

  useEffect(() => {
    if (!invoice || clientEmail || !invoice.client_id || !currentUser?.uid) return;
    if (organization?.id) {
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      })
        .then((res) => res.json())
        .then((data) => {
          const clients = Array.isArray(data?.clients) ? data.clients : [];
          const client = clients.find((c) => c.id === invoice.client_id);
          if (client?.email) setClientEmail(String(client.email).trim());
        })
        .catch(() => {});
    } else {
      getUserAccount(currentUser.uid).then((account) => {
        const clients = Array.isArray(account?.clients) ? account.clients : [];
        const client = clients.find((c) => c.id === invoice.client_id);
        if (client?.email) setClientEmail(String(client.email).trim());
      }).catch(() => {});
    }
  }, [invoice, clientEmail, organization?.id, currentUser?.uid]);

  const handleSend = () => {
    const to = clientEmail.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError('Please enter a valid email address');
      return;
    }
    setSending(true);
    setError('');
    fetch('/api/send-receipt-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        invoiceId: receiptId,
        to,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.sent) {
          setSent(true);
        } else {
          setError(data.error || 'Failed to send email');
        }
      })
      .catch(() => setError('Failed to send email'))
      .finally(() => setSending(false));
  };

  if (!currentUser?.uid || !receiptId) return null;

  return (
    <>
      <Head>
        <title>Email receipt - GoManagr</title>
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Email receipt"
          description="Send this receipt to the client by email."
          actions={
            <Link href={receiptId ? `/dashboard/receipts?open=${encodeURIComponent(receiptId)}` : '/dashboard/receipts'}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to receipt
              </SecondaryButton>
            </Link>
          }
        />

        {loading ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        ) : error && !invoice ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Link href="/dashboard/receipts" className="mt-4 inline-block">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to receipts
              </SecondaryButton>
            </Link>
          </div>
        ) : sent ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20 p-8 text-center">
            <p className="text-emerald-700 dark:text-emerald-300 font-medium">Receipt sent successfully.</p>
            <Link href={receiptId ? `/dashboard/receipts?open=${encodeURIComponent(receiptId)}` : '/dashboard/receipts'} className="mt-4 inline-block">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to receipt
              </SecondaryButton>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 max-w-md">
            <label htmlFor="receipt-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send receipt to
            </label>
            <input
              id="receipt-email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <PrimaryButton type="button" onClick={handleSend} disabled={sending || !clientEmail.trim()}>
                {sending ? 'Sending…' : 'Send receipt'}
              </PrimaryButton>
              <Link href={receiptId ? `/dashboard/receipts?open=${encodeURIComponent(receiptId)}` : '/dashboard/receipts'}>
                <SecondaryButton type="button">Cancel</SecondaryButton>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
