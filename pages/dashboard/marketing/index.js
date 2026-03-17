import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
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
      <div className="min-h-[60vh] rounded-2xl bg-gradient-to-br from-slate-50 via-gray-50/80 to-primary-50/30 dark:from-gray-900/60 dark:via-slate-900/40 dark:to-primary-950/20 border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
        <div className="p-6 md:p-8 lg:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                Marketing Campaigns
              </h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-xl text-base leading-relaxed">
                Create email or SMS campaigns. Choose a type below, then compose and save or send.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
              <SecondaryButton
                type="button"
                className="gap-2 border-2 border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                onClick={() => router.push('/dashboard/settings?section=integrations')}
              >
                Configure Providers
              </SecondaryButton>
              <PrimaryButton type="button" className="gap-2 shadow-md" onClick={handleAddCampaign}>
                <HiPlus className="w-5 h-5" />
                Add Campaign
              </PrimaryButton>
            </div>
          </div>

          {/* Campaign type pills */}
          <div className="flex flex-wrap gap-2">
            {MARKETING_VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleViewChange(id)}
                aria-pressed={activeView === id}
                className={`
                  inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  ${activeView === id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25 dark:bg-primary-500 dark:shadow-primary-600/30'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/20'
                  }
                `}
              >
                <Icon className="w-5 h-5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {activeView === VIEW_EMAIL && (
              <EmailCampaignView key={`email-${addCampaignKey}`} showPageHeader={false} userId={currentUser?.uid ?? null} />
            )}
            {activeView === VIEW_SMS && (
              <SMSCampaignView key={`sms-${addCampaignKey}`} showPageHeader={false} userId={currentUser?.uid ?? null} />
            )}
          </div>

          {/* Capability matrix */}
          <section className="pt-6 border-t border-gray-200/80 dark:border-gray-700/80">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary-500" aria-hidden />
              Capability matrix
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 shadow-sm backdrop-blur-sm">
              <Table
                ariaLabel="Provider capabilities"
                className="w-full"
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
      </div>
    </>
  );
}
