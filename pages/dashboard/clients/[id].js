import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
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

  const fetchClientData = useCallback(async () => {
    if (!currentUser?.uid || !id) return;
    
    setLoaded(false);
    try {
      const data = await getUserAccount(currentUser.uid);
      setUserAccount(data || null);
      const clients = (data?.clients && data.clients.length > 0)
        ? data.clients
        : DEFAULT_CLIENTS;
      const foundClient = clients.find((c) => c.id === id);
      if (foundClient) {
        setClientData(foundClient);
      } else if (id === 'new') {
        // New client
        setClientData(null);
      } else {
        // Client not found, redirect back
        router.push('/dashboard/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
      router.push('/dashboard/clients');
    } finally {
      setLoaded(true);
    }
  }, [currentUser?.uid, id, router]);

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
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading client...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!client && id !== 'new') {
    return null; // Will redirect
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
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
              onSave={(savedClientId) => {
                // After save, refresh data and navigate if needed
                if (id === 'new' && savedClientId) {
                  // New client was created, navigate to its page
                  router.push(`/dashboard/clients/${savedClientId}`);
                } else {
                  // Existing client was updated, refresh the data
                  setRefreshKey(prev => prev + 1);
                  fetchClientData();
                }
              }}
              onCancel={() => {
                router.push('/dashboard/clients');
              }}
            />
          </div>
        </>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
