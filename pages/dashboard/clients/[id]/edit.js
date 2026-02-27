import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import ClientProfile from '@/components/clients/ClientProfile';
import ClientFormPageSkeleton from '@/components/clients/ClientFormPageSkeleton';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';

/**
 * Edit client page. Client data is loaded and prepopulated in ClientProfile.
 * Only the main form Save button persists the client; drawers (e.g. appointments) work independently.
 */
export default function EditClientPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  const fetchClientData = useCallback(async () => {
    if (!currentUser?.uid || !id) return;

    setLoaded(false);
    try {
      const account = await getUserAccount(currentUser.uid);
      let clients = account?.clients ?? [];
      const orgRes = await fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      });
      const orgData = await orgRes.json().catch(() => ({}));
      const orgClients = orgData?.clients ?? [];
      if (orgClients.length > 0) {
        clients = orgClients;
        setUserAccount(account ? { ...account, clients } : { clients });
      } else {
        if (clients.length === 0) clients = DEFAULT_CLIENTS;
        setUserAccount(account || null);
      }

      const foundClient = clients.find((c) => c.id === id);
      if (foundClient) {
        setClientData(foundClient);
      } else {
        router.replace('/dashboard/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
      router.replace('/dashboard/clients');
    } finally {
      setLoaded(true);
    }
  }, [currentUser?.uid, id, router]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const client = useMemo(() => clientData, [clientData, refreshKey]);

  if (!loaded) {
    return (
      <>
        <Head>
          <title>Edit Client - GoManagr</title>
          <meta name="description" content="Loading client..." />
        </Head>
        <ClientFormPageSkeleton />
      </>
    );
  }

  if (!client) {
    return null;
  }

  const onSaveClient = organization
    ? async (clientDataPayload, isNew) => {
        const res = await fetch('/api/update-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            client: clientDataPayload,
            action: isNew ? 'add' : 'update',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to save client');
      }
    : undefined;

  return (
    <>
      <Head>
        <title>{client.name || 'Client'} - GoManagr</title>
        <meta name="description" content={`View and edit ${client.name}`} />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={`Edit ${client.name || 'Client'}`}
          description="Update this client's details."
          actions={
            <Link href="/dashboard/clients">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to clients
              </SecondaryButton>
            </Link>
          }
        />
        <ClientProfile
          key={`${client.id}-${refreshKey}`}
          initialClient={client}
          userAccount={userAccount}
          onSaveClient={onSaveClient}
          onSave={() => {
            setRefreshKey((prev) => prev + 1);
            fetchClientData();
          }}
          onCancel={() => router.push('/dashboard/clients')}
        />
      </div>
    </>
  );
}
