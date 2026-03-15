import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader, SidebarNav } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import Table from '@/components/ui/Table';
import EmailCampaignView from '@/components/marketing/EmailCampaignView';
import SMSCampaignView from '@/components/marketing/SMSCampaignView';
import { getMarketingSettings } from '@/lib/marketing/marketingSettingsService';
import { getProviderCapabilities, PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';
import { HiPlus, HiMail, HiChat } from 'react-icons/hi';

const VIEW_EMAIL = 'email';
const VIEW_SMS = 'sms';

const MARKETING_VIEWS = [
  { id: VIEW_EMAIL, label: 'Email Marketing', icon: HiMail },
  { id: VIEW_SMS, label: 'SMS Marketing', icon: HiChat },
];

export default function MarketingPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const viewFromQuery = typeof router.query.view === 'string' ? router.query.view : null;
  const [activeView, setActiveView] = useState(
    viewFromQuery === VIEW_SMS ? VIEW_SMS : VIEW_EMAIL
  );
  const [addCampaignKey, setAddCampaignKey] = useState(0);
  const [marketingSettings, setMarketingSettings] = useState(null);

  useEffect(() => {
    if (viewFromQuery === VIEW_SMS || viewFromQuery === VIEW_EMAIL) {
      setActiveView(viewFromQuery);
    }
  }, [viewFromQuery]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getMarketingSettings(currentUser.uid.trim())
      .then(setMarketingSettings)
      .catch(() => setMarketingSettings(null));
  }, [currentUser?.uid]);

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

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <SidebarNav
            items={MARKETING_VIEWS}
            activeId={activeView}
            onSelect={handleViewChange}
            ariaLabel="Campaign type"
          />

          <div className="flex-1 min-w-0">
            {activeView === VIEW_EMAIL && (
              <EmailCampaignView key={`email-${addCampaignKey}`} showPageHeader={false} />
            )}
            {activeView === VIEW_SMS && (
              <SMSCampaignView key={`sms-${addCampaignKey}`} showPageHeader={false} />
            )}
          </div>
        </div>

        <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Capability matrix</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <Table
              ariaLabel="Provider capabilities"
              className="w-full bg-white dark:bg-gray-800"
              columns={[
                { key: 'provider', label: 'Provider' },
                { key: 'email', label: 'Email', render: (r) => (r.email ? 'Yes' : '—') },
                { key: 'sms', label: 'SMS', render: (r) => (r.sms ? 'Yes' : '—') },
                { key: 'enabled', label: 'Enabled', render: (r) => (r.enabled ? 'Yes' : 'No') },
                { key: 'defaultEmail', label: 'Default (email)', render: (r) => (r.defaultEmail ? 'Default' : '—') },
                { key: 'defaultSms', label: 'Default (SMS)', render: (r) => (r.defaultSms ? 'Default' : '—') },
              ]}
              data={
                marketingSettings?.providers?.length
                  ? marketingSettings.providers.map((p) => {
                      const caps = getProviderCapabilities(p);
                      return {
                        id: p.providerType,
                        provider: PROVIDER_DISPLAY_NAMES[p.providerType] || p.providerType,
                        email: caps.email,
                        sms: caps.sms,
                        enabled: p.enabled,
                        defaultEmail: marketingSettings.defaultEmailProvider === p.providerType,
                        defaultSms: marketingSettings.defaultSmsProvider === p.providerType,
                      };
                    })
                  : []
              }
              getRowKey={(r) => r.id}
            />
          </div>
        </section>
      </div>
    </>
  );
}
