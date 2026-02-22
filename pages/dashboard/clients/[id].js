import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import ClientProfile from '@/components/clients/ClientProfile';
import { PageHeader } from '@/components/ui';
import { HiArrowLeft } from 'react-icons/hi';
import Link from 'next/link';
import { PrimaryButton } from '@/components/ui/buttons';

export default function ClientProfilePage() {
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
      const isInOrg = organization != null;
      const memberRole = organization?.membership?.role;

      let clients;
      if (isInOrg) {
        const res = await fetch('/api/get-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        });
        const data = await res.json().catch(() => ({}));
        clients = data?.clients ?? [];
        setUserAccount(account ? { ...account, clients } : { clients });
      } else {
        clients = (account?.clients && account.clients.length > 0) ? account.clients : DEFAULT_CLIENTS;
        setUserAccount(account || null);
      }

      const foundClient = clients.find((c) => c.id === id);
      if (foundClient) {
        setClientData(foundClient);
      } else if (id === 'new') {
        setClientData(null);
      } else {
        router.push('/dashboard/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
      router.push('/dashboard/clients');
    } finally {
      setLoaded(true);
    }
  }, [currentUser?.uid, id, organization, router]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);
  
  // Memoize client - update when clientData changes or refresh is triggered
  const client = useMemo(() => {
    if (id === 'new' || !clientData) {
      return null;
    }
    return clientData;
  }, [clientData, id, refreshKey]); // Include refreshKey to force updates on refresh

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading client...</p>
        </div>
      </div>
    );
  }

  if (!client && id !== 'new') {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
            <title>{client ? `${client.name || 'Client'} - GoManagr` : 'New Client - GoManagr'}</title>
            <meta name="description" content={client ? `View and edit ${client.name}` : 'Add a new client'} />
          </Head>

          <div className="space-y-6">
            <PageHeader
              title={
                <div className="flex items-center gap-3">
                  <Link href="/dashboard/clients">
                    <button className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <HiArrowLeft className="w-5 h-5" />
                    </button>
                  </Link>
                  <span>{client ? (client.name || 'Client') : 'New Client'}</span>
                </div>
              }
              description={client ? 'View and edit client information' : 'Add a new client to your account'}
            />

            <ClientProfile
              key={id === 'new' ? 'new-client' : `${client?.id || 'client'}-${refreshKey}`}
              initialClient={id === 'new' ? null : client}
              userAccount={userAccount}
              onSaveClient={
                organization && organization.membership?.role === 'member'
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
                      if (!res.ok) throw new Error(data.error || 'Failed to save client');
                    }
                  : undefined
              }
              onSave={(savedClientId) => {
                if (id === 'new' && savedClientId) {
                  router.push(`/dashboard/clients/${savedClientId}`);
                } else {
                  setRefreshKey((prev) => prev + 1);
                  fetchClientData();
                }
              }}
              onCancel={() => {
                router.push('/dashboard/clients');
              }}
            />
          </div>
    </>
  );
}
