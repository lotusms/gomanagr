import Head from 'next/head';
import { useRouter } from 'next/router';
import { PageHeader } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import SMSCampaignView from '@/components/marketing/SMSCampaignView';
import MarketingProviderSettings from '@/components/settings/MarketingProviderSettings';
import { HiPlus } from 'react-icons/hi';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import { useState } from 'react';
import { HiSpeakerphone } from 'react-icons/hi';

export default function MarketingPage() {
  const router = useRouter();
  const [providersOpen, setProvidersOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Marketing | GoManagr</title>
        <meta name="description" content="Create and send SMS or email campaigns to clients or team members." />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Marketing"
          description="Create campaigns and configure email/SMS providers below."
          actions={
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="button" className="gap-2" disabled>
                <HiPlus className="w-5 h-5" />
                New SMS Campaign
              </PrimaryButton>
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/marketing/email')}
              >
                <HiPlus className="w-5 h-5" />
                New Email Campaign
              </PrimaryButton>
            </div>
          }
        />

        <CollapsibleSection
          title="Marketing providers"
          isOpen={providersOpen}
          onToggle={() => setProvidersOpen(!providersOpen)}
          icon={<HiSpeakerphone className="w-5 h-5" aria-hidden />}
        >
          <MarketingProviderSettings embedInMarketingPage />
        </CollapsibleSection>

        <SMSCampaignView showPageHeader={false} />
      </div>
    </>
  );
}
