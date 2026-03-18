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

export default function EditCampaignPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { id: campaignId } = router.query;
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [campaignLoaded, setCampaignLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (router.isReady) setReady(true);
  }, [router.isReady]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !campaignId) return;
    let cancelled = false;
    setCampaignLoaded(false);
    setLoadError(null);

    fetch('/api/get-marketing-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid, campaignId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.campaign) {
          setCampaign(data.campaign);
        } else {
          setLoadError(data.error || 'Campaign not found');
        }
        setCampaignLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load campaign');
          setCampaignLoaded(true);
        }
      });

    return () => { cancelled = true; };
  }, [currentUser?.uid, campaignId]);

  if (!ready || !currentUser?.uid) return null;

  const loading = !orgResolved || !campaignLoaded;

  if (loading) {
    return (
      <>
        <Head>
          <title>Edit Campaign - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  if (loadError || !campaign) {
    return (
      <>
        <Head>
          <title>Campaign Not Found - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title="Campaign Not Found"
            description={loadError || 'The campaign you are looking for does not exist.'}
            actions={
              <Link href={BACK_URL}>
                <SecondaryButton type="button" className="gap-2">
                  <HiArrowLeft className="w-5 h-5" />
                  Back to campaigns
                </SecondaryButton>
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const campaignTitle = campaign.name || 'Untitled Campaign';

  return (
    <>
      <Head>
        <title>Edit: {campaignTitle} - GoManagr</title>
        <meta name="description" content={`Edit campaign: ${campaignTitle}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit: ${campaignTitle}`}
          description="Update the campaign details, then save or send."
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
          campaign={campaign}
          userId={currentUser.uid}
          organizationId={organization?.id ?? null}
          onSuccess={() => router.push(BACK_URL)}
          onCancel={() => router.push(BACK_URL)}
        />
      </div>
    </>
  );
}
