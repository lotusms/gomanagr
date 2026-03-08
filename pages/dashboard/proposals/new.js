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
import ClientProposalForm from '@/components/clients/add-client/ClientProposalForm';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function NewProposalPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [industry, setIndustry] = useState(null);
  const [ready, setReady] = useState(false);

  const accountIndustry = organization?.industry ?? industry;
  const clientTermSingular = getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'Client';
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const proposalTermPlural = getTermForIndustry(accountIndustry, 'proposal');
  const proposalTermSingular = getTermSingular(proposalTermPlural) || 'Proposal';
  const proposalTermSingularLower = proposalTermSingular.toLowerCase();
  const proposalTermPluralLower = (proposalTermPlural || 'proposals').toLowerCase();

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
        if (account?.industry) setIndustry(account.industry);
      })
      .catch(() => setDefaultCurrency('USD'));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady) setReady(true);
  }, [router.isReady]);

  const backUrl = '/dashboard/proposals';

  if (!ready || !currentUser?.uid) return null;

  if (!orgResolved) {
    return (
      <>
        <Head>
          <title>Create {proposalTermSingularLower} - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Create {proposalTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Create a new ${proposalTermSingularLower} for a ${clientTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Create ${proposalTermSingular}`}
          description={`Create a sales offer or estimate. Select the ${clientTermSingularLower} this ${proposalTermSingularLower} is for.`}
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
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
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
