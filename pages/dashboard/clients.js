import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateClients } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import PersonCard from '@/components/dashboard/PersonCard';
import ClientsPageSkeleton from '@/components/dashboard/ClientsPageSkeleton';
import { PageHeader, EmptyState, ConfirmationDialog, ConfirmDialog, InputField, Table } from '@/components/ui';
import { PrimaryButton, SecondaryButton, DangerButton, IconButton } from '@/components/ui/buttons';
import Drawer from '@/components/ui/Drawer';
import ClientSettings from '@/components/clients/ClientSettings';
import { shouldShowCompanyDetails } from '@/components/clients/clientProfileConstants';
import { useToast } from '@/components/ui/Toast';
import * as Dialog from '@radix-ui/react-dialog';
import { HiPlus, HiCog, HiExclamationCircle, HiX, HiRefresh, HiTrash } from 'react-icons/hi';

function ClientsContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateDialogConfirmWord, setDeactivateDialogConfirmWord] = useState('');
  const [clientToDeactivate, setClientToDeactivate] = useState(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [useOrgClients, setUseOrgClients] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [deactivatedPanelOpen, setDeactivatedPanelOpen] = useState(false);
  const [clientToReactivate, setClientToReactivate] = useState(null);
  const [clientToPermanentlyDelete, setClientToPermanentlyDelete] = useState(null);

  const activeClients = useMemo(
    () => allClients.filter((c) => (c.status || 'active') !== 'inactive'),
    [allClients]
  );
  const deactivatedClients = useMemo(
    () => allClients.filter((c) => (c.status || 'active') === 'inactive'),
    [allClients]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  const organizationId = organization?.id ?? null;
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);

    const isInOrg = organization != null;
    const memberRole = organization?.membership?.role;
    const admin = memberRole === 'admin';

    const done = () => setLoaded(true);

    if (isInOrg) {
      setUseOrgClients(true);
      setIsOrgAdmin(admin);
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      })
        .then((r) => r.json())
        .then((data) => {
          setAllClients(data?.clients ?? []);
        })
        .catch(() => setAllClients([]))
        .finally(done);
    } else {
      setUseOrgClients(false);
      setIsOrgAdmin(false);
      getUserAccount(currentUser.uid)
        .then((data) => {
          setAllClients(Array.isArray(data?.clients) ? data.clients : []);
        })
        .catch(() => setAllClients([]))
        .finally(done);
    }
  }, [currentUser?.uid, organizationId]);

  const refetchOrgClients = () => {
    if (!currentUser?.uid || !useOrgClients) return;
    fetch('/api/get-org-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setAllClients(data?.clients ?? []))
      .catch(() => setAllClients([]));
  };

  const handleRemove = (client) => {
    setClientToDeactivate(client);
    setDeactivateDialogConfirmWord('');
    setDeactivateDialogOpen(true);
  };

  const deactivateDialogConfirmed = deactivateDialogConfirmWord.trim().toUpperCase() === 'CONFIRM';

  const handleDeactivateConfirm = async () => {
    if (!clientToDeactivate || !currentUser?.uid) return;
    setSaving(true);
    try {
      if (useOrgClients) {
        const res = await fetch('/api/update-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            client: { ...clientToDeactivate, status: 'inactive' },
            action: 'deactivate',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to deactivate');
        refetchOrgClients();
        toast.success('Client deactivated. You can reactivate or delete them from Deactivated Clients.');
      } else {
        const account = await getUserAccount(currentUser.uid);
        const list = account?.clients || [];
        const updated = list.map((c) =>
          c.id === clientToDeactivate.id ? { ...c, status: 'inactive' } : c
        );
        await updateClients(currentUser.uid, updated);
        setAllClients(updated);
        setUserAccount((prev) => (prev ? { ...prev, clients: updated } : null));
        toast.success('Client deactivated. You can reactivate or delete them from Deactivated Clients.');
      }
      setDeactivateDialogOpen(false);
      setClientToDeactivate(null);
      setDeactivateDialogConfirmWord('');
    } catch (err) {
      console.error('Failed to deactivate client:', err);
      toast.error(err.message || 'Failed to deactivate client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFromDeactivateDialog = async () => {
    if (!clientToDeactivate || !currentUser?.uid) return;
    setSaving(true);
    try {
      if (useOrgClients) {
        const res = await fetch('/api/update-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            client: clientToDeactivate,
            action: 'delete',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to delete');
        refetchOrgClients();
        toast.success('Client permanently deleted.', 5000);
      } else {
        const account = await getUserAccount(currentUser.uid);
        const list = account?.clients || [];
        const updated = list.filter((c) => c.id !== clientToDeactivate.id);
        await updateClients(currentUser.uid, updated);
        setAllClients(updated);
        setUserAccount((prev) => (prev ? { ...prev, clients: updated } : null));
        toast.success('Client permanently deleted.', 5000);
      }
      setDeactivateDialogOpen(false);
      setClientToDeactivate(null);
      setDeactivateDialogConfirmWord('');
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast.error(err.message || 'Failed to delete client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateDialogCancel = () => {
    setDeactivateDialogOpen(false);
    setClientToDeactivate(null);
    setDeactivateDialogConfirmWord('');
  };

  const handleReactivateConfirm = async () => {
    if (!clientToReactivate || !currentUser?.uid) return;
    setSaving(true);
    try {
      if (useOrgClients) {
        const res = await fetch('/api/update-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            client: { ...clientToReactivate, status: 'active' },
            action: 'update',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to reactivate');
        refetchOrgClients();
        toast.success(`${clientToReactivate.name} has been reactivated. They will appear on the clients page.`);
      } else {
        const account = await getUserAccount(currentUser.uid);
        const list = account?.clients || [];
        const updated = list.map((c) =>
          c.id === clientToReactivate.id ? { ...c, status: 'active' } : c
        );
        await updateClients(currentUser.uid, updated);
        setAllClients(updated);
        setUserAccount((prev) => (prev ? { ...prev, clients: updated } : null));
        toast.success(`${clientToReactivate.name} has been reactivated.`);
      }
      setClientToReactivate(null);
      setDeactivatedPanelOpen(false);
    } catch (err) {
      console.error('Failed to reactivate client:', err);
      toast.error(err.message || 'Failed to reactivate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePermanentlyDeleteConfirm = async () => {
    if (!clientToPermanentlyDelete || !currentUser?.uid) return;
    setSaving(true);
    try {
      if (useOrgClients) {
        const res = await fetch('/api/update-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            client: clientToPermanentlyDelete,
            action: 'delete',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to delete');
        refetchOrgClients();
        toast.success('Client permanently deleted.');
      } else {
        const account = await getUserAccount(currentUser.uid);
        const list = account?.clients || [];
        const updated = list.filter((c) => c.id !== clientToPermanentlyDelete.id);
        await updateClients(currentUser.uid, updated);
        setAllClients(updated);
        setUserAccount((prev) => (prev ? { ...prev, clients: updated } : null));
        toast.success('Client permanently deleted.');
      }
      setClientToPermanentlyDelete(null);
      setDeactivatedPanelOpen(false);
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast.error(err.message || 'Failed to delete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    router.push('/dashboard/clients/new');
  };

  const handleEdit = (client) => {
    router.push(`/dashboard/clients/${client.id}/edit`);
  };

  return (
    <>
      <Head>
        <title>Clients - GoManagr</title>
        <meta name="description" content="Manage your clients" />
      </Head>

      <div className="space-y-6">
        {!loaded ? (
          <ClientsPageSkeleton />
        ) : (
          <>
            <PageHeader
              title="Clients"
              description="Manage your client relationships. Stored in your account and synced across the app."
              actions={
                <div className="flex items-center gap-3">
                  <SecondaryButton
                    type="button"
                    onClick={() => setDeactivatedPanelOpen((prev) => !prev)}
                    className="gap-2"
                    aria-expanded={deactivatedPanelOpen}
                  >
                    Deactivated Clients
                    {deactivatedClients.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-xs font-medium rounded-full">
                        {deactivatedClients.length}
                      </span>
                    )}
                  </SecondaryButton>
                  <PrimaryButton
                    type="button"
                    onClick={handleAdd}
                    className="gap-2"
                  >
                    <HiPlus className="w-5 h-5" />
                    Add client
                  </PrimaryButton>
                  <button
                    type="button"
                    onClick={() => setSettingsDrawerOpen(true)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Client Settings"
                    aria-label="Client Settings"
                  >
                    <HiCog className="w-5 h-5" />
                  </button>
                  {saving && <span className="text-sm text-gray-500 dark:text-gray-400">Saving…</span>}
                </div>
              }
            />
            {deactivatedPanelOpen && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" data-testid="deactivated-clients-panel">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deactivated clients</h2>
                  <button
                    type="button"
                    onClick={() => setDeactivatedPanelOpen(false)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  {deactivatedClients.length === 0 ? (
                    <p className="px-4 py-8 text-gray-500 dark:text-gray-400 text-center" data-testid="deactivated-clients-empty">No deactivated clients.</p>
                  ) : (
                    <Table
                      ariaLabel="Deactivated clients"
                      data-testid="deactivated-clients-table"
                      columns={[
                        { key: 'name', label: 'Name' },
                        ...(shouldShowCompanyDetails(userAccount?.clientSettings, userAccount?.industry)
                          ? [{ key: 'company', label: 'Company' }]
                          : []),
                        { key: 'addedByName', label: 'Added by', render: (row) => row.addedByName || '—' },
                        {
                          key: 'actions',
                          label: 'Actions',
                          align: 'center',
                          compact: true,
                          render: (client) => (
                            <div className="flex items-center justify-center gap-1">
                              <IconButton
                                variant="primary"
                                onClick={() => setClientToReactivate(client)}
                                disabled={saving}
                                aria-label="Reactivate"
                                title="Reactivate"
                              >
                                <HiRefresh className="w-5 h-5" />
                              </IconButton>
                              <IconButton
                                variant="danger"
                                onClick={() => setClientToPermanentlyDelete(client)}
                                disabled={saving}
                                aria-label="Delete forever"
                                title="Delete forever"
                              >
                                <HiTrash className="w-5 h-5" />
                              </IconButton>
                            </div>
                          ),
                        },
                      ]}
                      data={deactivatedClients}
                      getRowKey={(c) => c.id}
                    />
                  )}
                </div>
              </div>
            )}

            <ConfirmDialog
              isOpen={!!clientToReactivate}
              onClose={() => setClientToReactivate(null)}
              onConfirm={handleReactivateConfirm}
              title="Reactivate client"
              message={
                clientToReactivate
                  ? `${clientToReactivate.name} will be reactivated. They will appear back on the clients page.`
                  : ''
              }
              confirmText="Reactivate"
              cancelText="Cancel"
              variant="info"
              loading={saving}
            />

            <ConfirmationDialog
              isOpen={!!clientToPermanentlyDelete}
              onClose={() => setClientToPermanentlyDelete(null)}
              onConfirm={handlePermanentlyDeleteConfirm}
              title="Permanently delete client"
              message={
                clientToPermanentlyDelete
                  ? `This client will be fully deleted forever. This cannot be undone. Their record will be removed.`
                  : ''
              }
              confirmText="Delete forever"
              cancelText="Cancel"
              confirmationWord="delete"
              confirmationLabel="Type delete to confirm"
              variant="danger"
            />

            {activeClients.length === 0 ? (
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
                {activeClients.map((client) => {
                  const showCompanyDetails = shouldShowCompanyDetails(
                    userAccount?.clientSettings,
                    userAccount?.industry
                  );
                  const editHref = client?.id ? `/dashboard/clients/${client.id}/edit` : null;
                  return editHref ? (
                    <div
                      key={client.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(editHref);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(editHref);
                        }
                      }}
                      className="block h-full cursor-pointer"
                    >
                      <PersonCard
                        name={client.name}
                        subtitle={showCompanyDetails ? client.company : undefined}
                        addedByName={client.addedByName}
                        onRemove={() => handleRemove(client)}
                        isClient={true}
                        hasCompany={showCompanyDetails && !!(client.company && client.company.trim())}
                      />
                    </div>
                  ) : (
                    <PersonCard
                      key={client.id}
                      name={client.name}
                      subtitle={showCompanyDetails ? client.company : undefined}
                      addedByName={client.addedByName}
                      onClick={() => handleEdit(client)}
                      onRemove={() => handleRemove(client)}
                      isClient={true}
                      hasCompany={showCompanyDetails && !!(client.company && client.company.trim())}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Deactivate client dialog (like team page: CONFIRM word, Deactivate vs Delete forever) */}
      <Dialog.Root open={deactivateDialogOpen} onOpenChange={(open) => !open && handleDeactivateDialogCancel()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-lg p-0 focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center">
                  <HiExclamationCircle className="size-10 text-amber-600 dark:text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <Dialog.Title className="text-2xl font-bold leading-tight text-amber-800 dark:text-amber-200">
                    Deactivate client
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="flex-shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all" aria-label="Close" disabled={saving}>
                    <HiX className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="px-6 py-6 bg-white dark:bg-gray-800">
              <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                {clientToDeactivate
                  ? `${clientToDeactivate.name} will be deactivated. They will be hidden from the clients page. You can reactivate or permanently delete them later from Deactivated Clients.`
                  : ''}
              </Dialog.Description>
              <div className="mb-6">
                <InputField
                  id="deactivate-dialog-confirm"
                  label="Type confirm to enable Deactivate or Delete forever"
                  type="text"
                  value={deactivateDialogConfirmWord}
                  onChange={(e) => setDeactivateDialogConfirmWord(e.target.value)}
                  placeholder="confirm"
                  disabled={saving}
                  variant="light"
                  autoComplete="off"
                  inputProps={{ autoCapitalize: 'off' }}
                />
              </div>
              <div className="flex justify-between items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <DangerButton
                  type="button"
                  onClick={handleDeleteFromDeactivateDialog}
                  disabled={saving || !deactivateDialogConfirmed}
                  className="flex-shrink-0"
                >
                  {saving ? 'Processing...' : 'Delete forever'}
                </DangerButton>
                <div className="flex gap-3 ml-auto">
                  <SecondaryButton type="button" onClick={handleDeactivateDialogCancel} disabled={saving}>
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton
                    type="button"
                    onClick={handleDeactivateConfirm}
                    disabled={saving || !deactivateDialogConfirmed}
                    className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                  >
                    {saving ? 'Processing...' : 'Deactivate'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Client Settings Drawer */}
      <Drawer
        isOpen={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        title="Client Settings"
        width="50vw"
      >
        <ClientSettings />
      </Drawer>
    </>
  );
}

export default function ClientsPage() {
  return <ClientsContent />;
}
