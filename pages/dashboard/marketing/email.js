import Head from 'next/head';
import { useRouter } from 'next/router';
import { PageHeader } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import EmailCampaignView from '@/components/marketing/EmailCampaignView';
import { HiPlus } from 'react-icons/hi';

export default function EmailMarketingPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Marketing | GoManagr</title>
        <meta name="description" content="Create and send email campaigns to clients or team members." />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Marketing"
          description="Use the buttons below to start a new SMS or email campaign."
          actions={
            <div className="flex flex-wrap gap-2">
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => router.push('/dashboard/marketing')}
              >
                <HiPlus className="w-5 h-5" />
                New SMS Campaign
              </PrimaryButton>
              <PrimaryButton type="button" className="gap-2" disabled>
                <HiPlus className="w-5 h-5" />
                New Email Campaign
              </PrimaryButton>
            </div>
          }
        />
        <EmailCampaignView showPageHeader={false} />
      </div>
    </>
  );
}
