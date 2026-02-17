import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateClients } from '@/services/userService';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';
import ClientForm from '@/components/dashboard/ClientForm';
import { PageHeader, EmptyState } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function generateId() {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ClientsContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
        const list = (data?.clients && data.clients.length > 0)
          ? data.clients
          : DEFAULT_CLIENTS;
        setClients(list);
      })
      .catch(() => setClients(DEFAULT_CLIENTS))
      .finally(() => setLoaded(true));
  }, [currentUser?.uid]);

  const saveClients = (nextClients) => {
    if (!currentUser?.uid) return;
    setSaving(true);
    updateClients(currentUser.uid, nextClients)
      .then(() => {
        setUserAccount((prev) => (prev ? { ...prev, clients: nextClients } : null));
        setClients(nextClients);
      })
      .catch((err) => console.error('Failed to save clients:', err))
      .finally(() => setSaving(false));
  };

  const handleRemove = (id) => {
    const next = clients.filter((c) => c.id !== id);
    saveClients(next);
  };

  const handleAdd = () => {
    setEditingClient(null);
    setShowAddDrawer(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowAddDrawer(true);
  };

  const handleSave = async (clientData) => {
    if (editingClient) {
      // Update existing client
      const updatedClient = {
        ...editingClient,
        name: clientData.name,
        company: clientData.company,
      };
      const next = clients.map((c) => (c.id === editingClient.id ? updatedClient : c));
      setClients(next);
      await saveClients(next);
    } else {
      // Add new client
      const newClient = {
        id: generateId(),
        name: clientData.name,
        company: clientData.company,
      };
      const next = [...clients, newClient];
      setClients(next);
      await saveClients(next);
    }
    setShowAddDrawer(false);
    setEditingClient(null);
  };

  const handleCloseDrawer = () => {
    setShowAddDrawer(false);
    setEditingClient(null);
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
                    onRemove={() => handleRemove(client.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Client Drawer */}
        <Drawer
          isOpen={showAddDrawer}
          onClose={handleCloseDrawer}
          title={editingClient ? 'Edit Client' : 'Add Client'}
        >
          <ClientForm
            initialClient={editingClient}
            onSubmit={handleSave}
            onCancel={handleCloseDrawer}
            saving={saving}
          />
        </Drawer>
      </div>
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
