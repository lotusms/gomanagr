import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import CampaignForm from '@/components/marketing/CampaignForm';

const BACK_URL = '/dashboard/marketing';

export default function NewCampaignPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [ready, setReady] = useState(false);

  const defaultChannel =
    typeof router.query.channel === 'string' && router.query.channel === 'sms'
      ? 'sms'
      : 'email';

  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady) setReady(true);
  }, [router.isReady]);

  if (!ready || !currentUser?.uid) return null;

  if (!orgResolved) {
    return (
      <>
        <Head>
          <title>New Campaign - GoManagr</title>
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
        <title>New Campaign - GoManagr</title>
        <meta name="description" content="Create a new marketing campaign" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="New Campaign"
          description="Compose an email or SMS campaign, then save as draft or send immediately."
          actions={
            <Link href={BACK_URL}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to campaigns
              </SecondaryButton>
            </Link>
          }
        />
        <CampaignForm
          userId={currentUser.uid}
          organizationId={organization?.id ?? null}
          defaultChannel={defaultChannel}
          onSuccess={() => router.push(BACK_URL)}
          onCancel={() => router.push(BACK_URL)}
        />
      </div>
    </>
  );
}
