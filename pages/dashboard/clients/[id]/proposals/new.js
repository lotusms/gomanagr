import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientProposalForm from '@/components/clients/add-client/ClientProposalForm';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function NewClientProposalPage() {
  const router = useRouter();
  const { id: clientId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [clientEmail, setClientEmail] = useState('');
  const [industry, setIndustry] = useState(null);
  const [ready, setReady] = useState(false);

  const accountIndustry = organization?.industry ?? userAccount?.industry ?? industry;
  const clientTermSingular = getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((o) => setOrganization(o || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !clientId) return;
    (async () => {
      try {
        const account = await getUserAccount(currentUser.uid);
        setUserAccount(account || null);
        if (account?.industry) setIndustry(account.industry);
        let clients = account?.clients ?? [];
        const orgRes = await fetch('/api/get-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        });
        const orgData = await orgRes.json().catch(() => ({}));
        const orgClients = orgData?.clients ?? [];
        if (orgClients.length > 0) clients = orgClients;
        const client = clients.find((c) => c.id === clientId);
        const currency =
          client?.defaultCurrency ||
          account?.clientSettings?.defaultCurrency ||
          'USD';
        setDefaultCurrency(currency);
        const email = (client?.email && String(client.email).trim()) || '';
        setClientEmail(email);
      } catch {
        setDefaultCurrency('USD');
      }
    })();
  }, [currentUser?.uid, clientId]);

  useEffect(() => {
    if (router.isReady && clientId) setReady(true);
  }, [router.isReady, clientId]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=proposals`;

  if (!ready || !currentUser?.uid) return null;

  return (
    <>
      <Head>
        <title>Add proposal - GoManagr</title>
        <meta name="description" content={`Add a proposal for this ${clientTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add proposal"
          description={`Create a sales offer or estimate for this ${clientTermSingularLower}.`}
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {clientTermSingular}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientProposalForm
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            defaultCurrency={defaultCurrency}
            clientEmail={clientEmail}
            industry={accountIndustry}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
