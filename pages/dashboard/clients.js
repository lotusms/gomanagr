import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateClients } from '@/services/userService';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';
import { PageHeader } from '@/components/ui';
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
  const [addName, setAddName] = useState('');
  const [addCompany, setAddCompany] = useState('');
  const [showAdd, setShowAdd] = useState(false);

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

  const handleAdd = (e) => {
    e.preventDefault();
    const name = addName.trim();
    if (!name) return;
    const newClient = {
      id: generateId(),
      name,
      company: addCompany.trim() || undefined,
    };
    const next = [...clients, newClient];
    setClients(next);
    saveClients(next);
    setAddName('');
    setAddCompany('');
    setShowAdd(false);
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
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <HiPlus className="w-5 h-5" />
                Add client
              </button>
              {saving && <span className="text-sm text-gray-500">Saving…</span>}
            </>
          }
        />

        {!loaded ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>

            {showAdd && (
              <form onSubmit={handleAdd} className="bg-gray-50 rounded-lg p-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Client name"
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
                  <input
                    type="text"
                    value={addCompany}
                    onChange={(e) => setAddCompany(e.target.value)}
                    placeholder="Company name"
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setAddName(''); setAddCompany(''); }}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients.map((client) => (
                <PersonCard
                  key={client.id}
                  name={client.name}
                  subtitle={client.company}
                  onRemove={() => handleRemove(client.id)}
                />
              ))}
            </div>
          </>
        )}
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
