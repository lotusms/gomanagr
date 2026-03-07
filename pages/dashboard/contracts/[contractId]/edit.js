import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft, HiClipboardList } from 'react-icons/hi';
import ClientContractForm from '@/components/clients/add-client/ClientContractForm';

export default function EditContractPage() {
  const router = useRouter();
  const { contractId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [contract, setContract] = useState(null);
  const [linkedAttachments, setLinkedAttachments] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [industry, setIndustry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const client = contract?.client_id ? account?.clients?.find((c) => c.id === contract.client_id) : null;
        const currency =
          client?.defaultCurrency ||
          account?.clientSettings?.defaultCurrency ||
          'USD';
        setDefaultCurrency(currency);
        if (account?.industry) setIndustry(account.industry);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid, contract?.client_id]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !contractId) return;
    setLoading(true);
    setNotFound(false);
    fetch('/api/get-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        contractId,
      }),
    })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.contract) setContract(data.contract);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, contractId, organization?.id]);

  useEffect(() => {
    if (!currentUser?.uid || !contract?.client_id || !contractId || notFound) return;
    fetch('/api/get-client-attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId: contract.client_id,
        organizationId: organization?.id ?? undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const list = data.attachments || [];
        setLinkedAttachments(list.filter((a) => a.linked_contract_id === contractId));
      })
      .catch(() => setLinkedAttachments([]));
  }, [currentUser?.uid, contract?.client_id, contractId, organization?.id, notFound]);

  const backUrl = '/dashboard/contracts';
  const accountIndustry = organization?.industry ?? industry;

  if (!currentUser?.uid || !contractId) return null;

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit contract - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !contract) {
    return (
      <>
        <Head>
          <title>Contract not found - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title="Contracts"
            description="Contracts created for your clients."
            actions={
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to contracts
                </SecondaryButton>
              </Link>
            }
          />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <HiClipboardList className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contract not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              This contract may have been deleted or you don&apos;t have access to it.
            </p>
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to contracts
              </SecondaryButton>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit contract - GoManagr</title>
        <meta name="description" content="Edit this contract" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Edit contract"
          description="Update the details of this contract."
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to contracts
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientContractForm
            initial={contract}
            clientId={contract.client_id}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            contractId={contractId}
            defaultCurrency={defaultCurrency}
            linkedAttachments={linkedAttachments}
            showClientDropdown={false}
            industry={accountIndustry}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
