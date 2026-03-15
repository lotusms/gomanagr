import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useCallback, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import EmailCampaignView from '@/components/marketing/EmailCampaignView';
import SMSCampaignView from '@/components/marketing/SMSCampaignView';
import { HiPlus, HiMail, HiChat } from 'react-icons/hi';

const VIEW_EMAIL = 'email';
const VIEW_SMS = 'sms';

export default function MarketingPage() {
  const router = useRouter();
  const viewFromQuery = typeof router.query.view === 'string' ? router.query.view : null;
  const [activeView, setActiveView] = useState(
    viewFromQuery === VIEW_SMS ? VIEW_SMS : VIEW_EMAIL
  );
  const [addCampaignKey, setAddCampaignKey] = useState(0);
  const [providersOpen, setProvidersOpen] = useState(false);

  useEffect(() => {
    if (viewFromQuery === VIEW_SMS || viewFromQuery === VIEW_EMAIL) {
      setActiveView(viewFromQuery);
    }
  }, [viewFromQuery]);

  const handleAddCampaign = useCallback(() => {
    setAddCampaignKey((k) => k + 1);
  }, []);

  const handleViewChange = useCallback((view) => {
    setActiveView(view);
    router.replace(
      `/dashboard/marketing${view === VIEW_SMS ? '?view=sms' : ''}`,
      undefined,
      { shallow: true }
    );
  }, [router]);

  return (
    <>
      <Head>
        <title>Marketing Campaigns | GoManagr</title>
        <meta name="description" content="Create and send SMS or email campaigns to clients or team members." />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Marketing Campaigns"
          description="Create email or SMS campaigns. Choose a type in the sidebar, then compose and save or send."
          actions={
            <>
              <SecondaryButton type="button" className="gap-2" onClick={() => router.push('/dashboard/settings?section=integrations')}>
                Configure Providers
              </SecondaryButton>
              <PrimaryButton type="button" className="gap-2" onClick={handleAddCampaign}>
                <HiPlus className="w-5 h-5" />
                Add Campaign
              </PrimaryButton>
            </>
          }
        />

        <div className="flex flex-col lg:flex-row gap-6">
          <nav
            className="flex lg:flex-col gap-1 lg:w-56 shrink-0"
            aria-label="Campaign type"
          >
            <button
              type="button"
              onClick={() => handleViewChange(VIEW_EMAIL)}
              className={`flex items-center gap-2 w-full lg:w-auto px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                activeView === VIEW_EMAIL
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <HiMail className="w-5 h-5 shrink-0" aria-hidden />
              Email Marketing
            </button>
            <button
              type="button"
              onClick={() => handleViewChange(VIEW_SMS)}
              className={`flex items-center gap-2 w-full lg:w-auto px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                activeView === VIEW_SMS
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <HiChat className="w-5 h-5 shrink-0" aria-hidden />
              SMS Marketing
            </button>
          </nav>

          <div className="flex-1 min-w-0">
            {activeView === VIEW_EMAIL && (
              <EmailCampaignView key={`email-${addCampaignKey}`} showPageHeader={false} />
            )}
            {activeView === VIEW_SMS && (
              <SMSCampaignView key={`sms-${addCampaignKey}`} showPageHeader={false} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
