import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateClients } from '@/services/userService';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';
import { PageHeader, EmptyState, ConfirmationDialog } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function ClientsContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [userAccount, setUserAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
        // Handle case where data is null (offline or no account yet)
        if (!data || !data.clients || data.clients.length === 0) {
          setClients([]);
          return;
        }
        // Filter to show only active clients (status !== 'inactive')
        // Default to 'active' if status is not set
        const activeClients = data.clients.filter((c) => (c.status || 'active') !== 'inactive');
        setClients(activeClients);
      })
      .catch((error) => {
        console.warn('Failed to load clients (may be offline):', error);
        // If offline or error, set empty array - data will load when connection is restored
        setClients([]);
        setUserAccount(null);
      })
      .finally(() => setLoaded(true));
  }, [currentUser?.uid]);

  const saveClients = (nextClients) => {
    if (!currentUser?.uid) return;
    setSaving(true);
    updateClients(currentUser.uid, nextClients)
      .then(() => {
        setUserAccount((prev) => (prev ? { ...prev, clients: nextClients } : null));
        // Filter to show only active clients in the display
        const activeClients = nextClients.filter((c) => (c.status || 'active') !== 'inactive');
        setClients(activeClients);
      })
      .catch((err) => console.error('Failed to save clients:', err))
      .finally(() => setSaving(false));
  };

  const handleRemove = (client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete || !currentUser?.uid) return;
    
    setSaving(true);
    try {
      // Get all clients (including inactive ones)
      const account = await getUserAccount(currentUser.uid);
      const allClients = account?.clients || [];
      
      // Update the client's status to 'inactive' instead of removing
      const updatedClients = allClients.map((c) =>
        c.id === clientToDelete.id ? { ...c, status: 'inactive' } : c
      );
      
      // Save updated clients
      await updateClients(currentUser.uid, updatedClients);
      
      // Update local state - filter out inactive clients
      const activeClients = updatedClients.filter((c) => (c.status || 'active') !== 'inactive');
      setClients(activeClients);
      setUserAccount((prev) => (prev ? { ...prev, clients: updatedClients } : null));
      
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Failed to deactivate client:', err);
      alert('Failed to deactivate client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const handleAdd = () => {
    router.push('/dashboard/clients/new');
  };

  const handleEdit = (client) => {
    router.push(`/dashboard/clients/${client.id}`);
  };

  return (
    <>
      <Head>
        <title>Clients - GoManagr</title>
        <meta name="description" content="Manage your clients" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Clients"
          description="Manage your client relationships. Stored in your account and synced across the app."
          actions={
            <>
              <PrimaryButton
                type="button"
                onClick={handleAdd}
                className="gap-2"
              >
                <HiPlus className="w-5 h-5" />
                Add client
              </PrimaryButton>
              {saving && <span className="text-sm text-gray-500 dark:text-gray-400">Saving…</span>}
            </>
          }
        />

        {!loaded ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            {clients.length === 0 ? (
              <EmptyState
                type="clients"
                action={
                  <PrimaryButton
                    type="button"
                    onClick={handleAdd}
                    className="gap-2"
                  >
                    <HiPlus className="w-5 h-5" />
                    Add your first client
                  </PrimaryButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {clients.map((client) => (
                  <PersonCard
                    key={client.id}
                    name={client.name}
                    subtitle={client.company}
                    onClick={() => handleEdit(client)}
                    onRemove={() => handleRemove(client)}
                    isClient={true}
                    hasCompany={!!(client.company && client.company.trim())}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Client"
        message={`Are you sure you want to deactivate "${clientToDelete?.name || 'this client'}"? The client will be removed from your active clients list, but their information will be retained for future reference.`}
        confirmText="Deactivate Client"
        cancelText="Cancel"
        confirmationWord="deactivate"
        variant="danger"
      />
    </>
  );
}

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ClientsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
