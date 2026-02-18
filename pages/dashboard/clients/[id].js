import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import ClientProfile from '@/components/dashboard/ClientProfile';
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

  useEffect(() => {
    if (!currentUser?.uid || !id) return;
    
    setLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
        const clients = (data?.clients && data.clients.length > 0)
          ? data.clients
          : DEFAULT_CLIENTS;
        const foundClient = clients.find((c) => c.id === id);
        if (foundClient) {
          // Only update if the client ID actually changed (prevents unnecessary updates)
          setClientData((prev) => {
            if (prev?.id === foundClient.id) {
              return prev; // Return previous reference if ID is the same
            }
            return foundClient;
          });
        } else if (id === 'new') {
          // New client
          setClientData(null);
        } else {
          // Client not found, redirect back
          router.push('/dashboard/clients');
        }
      })
      .catch(() => {
        router.push('/dashboard/clients');
      })
      .finally(() => setLoaded(true));
  }, [currentUser?.uid, id, router]);
  
  // Memoize client to prevent unnecessary re-renders - only update when client ID changes
  // Use a ref to track the previous client data to prevent unnecessary object recreation
  const previousClientDataRef = useRef(null);
  const previousClientIdRef = useRef(null);
  
  // Extract the ID value as a primitive for stable comparison
  const currentClientId = clientData?.id ?? null;
  
  const client = useMemo(() => {
    if (id === 'new' || !clientData) {
      previousClientDataRef.current = null;
      previousClientIdRef.current = null;
      return null;
    }
    
    // Only create new object reference if the ID actually changed
    if (previousClientIdRef.current !== currentClientId) {
      previousClientDataRef.current = clientData;
      previousClientIdRef.current = currentClientId;
      return clientData;
    }
    
    // If ID is the same, return the previous reference to maintain stability
    // This prevents ClientProfile from re-initializing when userAccount updates
    return previousClientDataRef.current;
    // Only depend on the primitive ID value - don't depend on clientData object reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClientId, id]); // Only depend on ID, not clientData object reference

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
              key={id === 'new' ? 'new-client' : client?.id || 'client'}
              initialClient={id === 'new' ? null : client}
              userAccount={userAccount}
              onSave={(savedClientId) => {
                // After save, refresh and stay on page (or redirect to new client ID if it was new)
                if (id === 'new' && savedClientId) {
                  router.push(`/dashboard/clients/${savedClientId}`);
                } else {
                  router.push(`/dashboard/clients/${id}`);
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
