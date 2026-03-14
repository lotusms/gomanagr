import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PageHeader } from '@/components/ui';
import { IconButton, PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import SMSCampaignView from '@/components/marketing/SMSCampaignView';
import { HiPlus, HiCog } from 'react-icons/hi';

export default function MarketingPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Marketing | GoManagr</title>
        <meta name="description" content="Create and send SMS or email campaigns to clients or team members." />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Marketing"
          description="Use the buttons below to start a new SMS or email campaign. Configure providers in Settings."
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
              <IconButton variant="light" asChild className="gap-2">
                <Link href="/dashboard/settings?section=api" className="inline-flex items-center justify-center gap-2">
                  <HiCog className="w-5 h-5" />
                </Link>
              </IconButton>
            </div>
          }
        />
        <SMSCampaignView showPageHeader={false} />
      </div>
    </>
  );
}
