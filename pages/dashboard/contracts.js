import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, Paginator } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import ContractsPageSkeleton from '@/components/dashboard/ContractsPageSkeleton';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';
import ContractCardServiceStyle from '@/components/dashboard/ContractCardServiceStyle';
import { HiPlus } from 'react-icons/hi';

function ContractsContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return contracts.slice(start, start + itemsPerPage);
  }, [contracts, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.ceil(contracts.length / itemsPerPage);
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [contracts.length, itemsPerPage, currentPage]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !orgResolved) return;
    setLoading(true);
    const orgId = organization?.id ?? undefined;

    Promise.all([
      fetch('/api/get-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => d.contracts || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
    ])
      .then(([contractsList, clientsList]) => {
        setContracts(contractsList);
        if (clientsList.length > 0) {
          setClients(clientsList);
        } else {
          getUserAccount(currentUser.uid).then((account) => {
            const fromAccount = Array.isArray(account?.clients) ? account.clients : [];
            setClients(fromAccount);
          }).catch(() => setClients([]));
        }
      })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, organization?.id]);

  const clientNameByClientId = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      const name = (c.name || c.companyName || 'Unnamed client').trim();
      if (c.id) map[c.id] = name;
    });
    return map;
  }, [clients]);

  const handleDeleteConfirm = async () => {
    if (!contractToDelete || !currentUser?.uid) return;
    try {
      const res = await fetch('/api/delete-client-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          contractId: contractToDelete,
          organizationId: organization?.id ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setContracts((prev) => prev.filter((c) => c.id !== contractToDelete));
      setContractToDelete(null);
    } catch (err) {
      console.error(err);
      setContractToDelete(null);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Contracts - GoManagr</title>
        </Head>
        <ContractsPageSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Contracts - GoManagr</title>
        <meta name="description" content="Manage contracts" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Contracts"
          description="Create and manage contracts for your clients"
          actions={
            <PrimaryButton
              type="button"
              className="gap-2"
              onClick={() => router.push('/dashboard/contracts/new')}
            >
              <HiPlus className="w-5 h-5" />
              Create contract
            </PrimaryButton>
          }
        />

        {contracts.length === 0 ? (
          <EmptyStateCard
            message="No contracts yet"
            action={
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/contracts/new')}
              >
                <HiPlus className="w-5 h-5" />
                Create your first contract
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedContracts.map((c) => (
                <ContractCardServiceStyle
                  key={c.id}
                  contract={c}
                  onSelect={(id) => router.push(`/dashboard/contracts/${id}/edit`)}
                  onDelete={setContractToDelete}
                  clientNameByClientId={clientNameByClientId}
                />
              ))}
            </div>
            {contracts.length > 6 && (
              <Paginator
                currentPage={currentPage}
                totalItems={contracts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 12, 24, 48, 96]}
                showItemsPerPage={true}
                maxVisiblePages={5}
                showInfo={false}
                showFirstLast={false}
                className="mt-6"
              />
            )}
            <ConfirmationDialog
              isOpen={!!contractToDelete}
              onClose={() => setContractToDelete(null)}
              onConfirm={handleDeleteConfirm}
              title="Delete contract"
              message="This contract will be permanently deleted. This cannot be undone."
              confirmText="Delete"
              cancelText="Cancel"
              confirmationWord="delete"
              variant="danger"
            />
          </>
        )}
      </div>
    </>
  );
}

export default function ContractsPage() {
  return <ContractsContent />;
}
