import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, Paginator } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import ProposalsPageSkeleton from '@/components/dashboard/ProposalsPageSkeleton';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';
import ProposalCardServiceStyle from '@/components/dashboard/ProposalCardServiceStyle';
import { HiPlus } from 'react-icons/hi';

function ProposalsContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return proposals.slice(start, start + itemsPerPage);
  }, [proposals, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.ceil(proposals.length / itemsPerPage);
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [proposals.length, itemsPerPage, currentPage]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Resolve org first so we never fetch proposals with wrong org (which would return [] for org users)
  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const currency = account?.clientSettings?.defaultCurrency || 'USD';
        setDefaultCurrency(currency);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid]);

  // Fetch proposals only after we know org state (org id or null). Prevents showing empty state when data exists.
  useEffect(() => {
    if (!currentUser?.uid || !orgResolved) return;
    setLoading(true);
    const orgId = organization?.id ?? undefined;

    Promise.all([
      fetch('/api/get-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => d.proposals || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
    ])
      .then(([proposalsList, clientsList]) => {
        setProposals(proposalsList);
        if (clientsList.length > 0) {
          setClients(clientsList);
        } else {
          getUserAccount(currentUser.uid).then((account) => {
            const fromAccount = Array.isArray(account?.clients) ? account.clients : [];
            setClients(fromAccount);
          }).catch(() => setClients([]));
        }
      })
      .catch(() => setProposals([]))
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
    if (!proposalToDelete || !currentUser?.uid) return;
    try {
      const res = await fetch('/api/delete-client-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          proposalId: proposalToDelete,
          organizationId: organization?.id ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setProposals((prev) => prev.filter((p) => p.id !== proposalToDelete));
      setProposalToDelete(null);
    } catch (err) {
      console.error(err);
      setProposalToDelete(null);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Proposals - GoManagr</title>
        </Head>
        <ProposalsPageSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Proposals - GoManagr</title>
        <meta name="description" content="Manage proposals" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Proposals"
          description="Proposals created for your clients. Add from here or from a client’s Documents section."
          actions={
            <PrimaryButton
              type="button"
              className="gap-2"
              onClick={() => router.push('/dashboard/proposals/new')}
            >
              <HiPlus className="w-5 h-5" />
              Create proposal
            </PrimaryButton>
          }
        />

        {proposals.length === 0 ? (
          <EmptyStateCard
            message="No proposals yet"
            action={
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/proposals/new')}
              >
                <HiPlus className="w-5 h-5" />
                Create your first proposal
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedProposals.map((p) => (
                <ProposalCardServiceStyle
                  key={p.id}
                  proposal={p}
                  onSelect={(id) => router.push(`/dashboard/proposals/${id}/edit`)}
                  onDelete={setProposalToDelete}
                  clientNameByClientId={clientNameByClientId}
                  organization={organization}
                />
              ))}
            </div>
            {proposals.length > 6 && (
              <Paginator
                currentPage={currentPage}
                totalItems={proposals.length}
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
              isOpen={!!proposalToDelete}
              onClose={() => setProposalToDelete(null)}
              onConfirm={handleDeleteConfirm}
              title="Delete proposal"
              message="This proposal will be permanently deleted. This cannot be undone."
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

export default function ProposalsPage() {
  return <ProposalsContent />;
}
