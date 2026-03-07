import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import ClientContractForm from '@/components/clients/add-client/ClientContractForm';

export default function EditClientContractPage() {
  const router = useRouter();
  const { id: clientId, contractId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [contract, setContract] = useState(null);
  const [linkedAttachments, setLinkedAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => setOrganization(org || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgReady(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !clientId) return;
    getUserAccount(currentUser.uid)
      .then((account) => {
        const client = account?.clients?.find((c) => c.id === clientId);
        const currency =
          client?.defaultCurrency ||
          account?.clientSettings?.defaultCurrency ||
          'USD';
        setDefaultCurrency(currency);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid, clientId]);

  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !clientId || !contractId) return;

    setLoading(true);
    setNotFound(false);
    fetch('/api/get-client-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
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
  }, [orgReady, currentUser?.uid, clientId, contractId, organization?.id]);

  useEffect(() => {
    if (!currentUser?.uid || !clientId || !contractId || notFound || !contract) return;
    fetch('/api/get-client-attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        clientId,
        organizationId: organization?.id ?? undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const list = data.attachments || [];
        setLinkedAttachments(list.filter((a) => a.linked_contract_id === contractId));
      })
      .catch(() => setLinkedAttachments([]));
  }, [currentUser?.uid, clientId, contractId, organization?.id, notFound, contract]);

  const backUrl = `/dashboard/clients/${clientId}/edit?tab=documents&section=contracts`;

  if (!currentUser?.uid || !clientId || !contractId) {
    return null;
  }

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
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Contract not found.</p>
          <Link href={backUrl}>
            <SecondaryButton type="button" className="gap-2">
              <HiArrowLeft className="w-5 h-5" />
              Back to client
            </SecondaryButton>
          </Link>
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
                Back to client
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientContractForm
            initial={contract}
            clientId={clientId}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            contractId={contractId}
            defaultCurrency={defaultCurrency}
            linkedAttachments={linkedAttachments}
            industry={organization?.industry ?? null}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
