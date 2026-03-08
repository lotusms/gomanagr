import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft, HiDocumentText } from 'react-icons/hi';
import ClientProposalForm from '@/components/clients/add-client/ClientProposalForm';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function EditProposalPage() {
  const router = useRouter();
  const { proposalId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgReady, setOrgReady] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [industry, setIndustry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const accountIndustry = organization?.industry ?? industry;
  const clientTermPluralLower = (getTermForIndustry(accountIndustry, 'client') || 'clients').toLowerCase();
  const clientTermSingularLower = (getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'Client').toLowerCase();
  const proposalTermPlural = getTermForIndustry(accountIndustry, 'proposal');
  const proposalTermSingular = getTermSingular(proposalTermPlural) || 'Proposal';
  const proposalTermPluralLower = (proposalTermPlural || 'proposals').toLowerCase();
  const proposalTermSingularLower = (proposalTermSingular || 'proposal').toLowerCase();

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
        const currency = account?.clientSettings?.defaultCurrency || 'USD';
        setDefaultCurrency(currency);
        if (account?.industry) setIndustry(account.industry);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid]);

  // Wait for org to resolve so we pass the correct organizationId (avoids 404 for org proposals)
  useEffect(() => {
    if (!orgReady || !currentUser?.uid || !proposalId) return;
    setLoading(true);
    setNotFound(false);
    fetch('/api/get-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        organizationId: organization?.id ?? undefined,
        proposalId,
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
        if (data?.proposal) setProposal(data.proposal);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orgReady, currentUser?.uid, proposalId, organization?.id]);

  const backUrl = '/dashboard/proposals';

  if (!currentUser?.uid || !proposalId) return null;

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit {proposalTermSingularLower} - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (notFound || !proposal) {
    return (
      <>
        <Head>
          <title>{proposalTermSingular} not found - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title={proposalTermPlural}
            description={`${proposalTermPlural} created for your ${clientTermPluralLower}.`}
            actions={
              <Link href={backUrl}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to {proposalTermPluralLower}
                </SecondaryButton>
              </Link>
            }
          />
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <HiDocumentText className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{proposalTermSingular} not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              This {proposalTermSingularLower} may have been deleted or you don&apos;t have access to it.
            </p>
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {proposalTermPluralLower}
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
        <title>Edit {proposalTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Edit this ${proposalTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${proposalTermSingular}`}
          description={`Update the details of this ${proposalTermSingularLower}. You can change the linked ${clientTermSingularLower} if needed.`}
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {proposalTermPluralLower}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <ClientProposalForm
            initial={proposal}
            clientId={proposal.client_id}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            proposalId={proposalId}
            defaultCurrency={defaultCurrency}
            showClientDropdown={true}
            industry={accountIndustry}
            onSuccess={() => router.push(backUrl)}
            onCancel={() => router.push(backUrl)}
          />
        </div>
      </div>
    </>
  );
}
