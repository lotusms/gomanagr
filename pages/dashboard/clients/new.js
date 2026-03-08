import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import ClientProfile from '@/components/clients/ClientProfile';
import ClientFormPageSkeleton from '@/components/clients/ClientFormPageSkeleton';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';

/**
 * New client page. Same ClientProfile as edit but with no initial client.
 * Only the main form Save button persists the client; drawers (e.g. appointments) work independently.
 */
export default function NewClientPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [organization, setOrganization] = useState(null);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermPlural = getTermForIndustry(accountIndustry, 'client');
  const clientTermSingular = getTermSingular(clientTermPlural) || 'Client';
  const clientTermSingularLower = (clientTermSingular || 'client').toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  const loadAccount = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    try {
      const account = await getUserAccount(currentUser.uid);
      const isInOrg = organization != null;
      if (isInOrg) {
        const res = await fetch('/api/get-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        });
        const data = await res.json().catch(() => ({}));
        const clients = data?.clients ?? [];
        setUserAccount(account ? { ...account, clients } : { clients });
      } else {
        setUserAccount(account || null);
      }
    } catch (error) {
      console.error('Failed to load account:', error);
      setUserAccount(null);
    } finally {
      setLoaded(true);
    }
  }, [currentUser?.uid, organization]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  if (!loaded) {
    return (
      <>
        <Head>
          <title>New {clientTermSingular} - GoManagr</title>
          <meta name="description" content={`Add a new ${clientTermSingularLower}`} />
        </Head>
        <ClientFormPageSkeleton />
      </>
    );
  }

  const onSaveClient = organization
    ? async (clientData, isNew) => {
        const res = await fetch('/api/update-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            client: clientData,
            action: isNew ? 'add' : 'update',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed to save ${clientTermSingularLower}`);
      }
    : undefined;

  return (
    <>
      <Head>
        <title>New {clientTermSingular} - GoManagr</title>
        <meta name="description" content={`Add a new ${clientTermSingularLower}`} />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={`Add ${clientTermSingular}`}
          description={`Add a new ${clientTermSingularLower} to your account.`}
          actions={
            <Link href="/dashboard/clients">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {clientTermPlural}
              </SecondaryButton>
            </Link>
          }
        />
        <ClientProfile
          key="new-client"
          initialClient={null}
          userAccount={userAccount}
          onSaveClient={onSaveClient}
          onSave={(savedClientId) => {
            if (savedClientId) {
              router.push(`/dashboard/clients/${savedClientId}/edit`);
            }
          }}
          onCancel={() => router.push('/dashboard/clients')}
        />
      </div>
    </>
  );
}
