import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import Table from '@/components/ui/Table';
import { EmptyState } from '@/components/ui';
import { getMarketingSettings } from '@/lib/marketing/marketingSettingsService';
import { getProviderCapabilities, PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';
import { getUserOrganization } from '@/services/organizationService';
import { HiPlus, HiMail, HiChat, HiSpeakerphone } from 'react-icons/hi';
import { formatDate } from '@/utils/dateTimeFormatters';
import EntityCard from '@/components/ui/EntityCard';

const FILTER_ALL = 'all';
const FILTER_EMAIL = 'email';
const FILTER_SMS = 'sms';

const CHANNEL_FILTERS = [
  { id: FILTER_ALL, label: 'All Campaigns' },
  { id: FILTER_EMAIL, label: 'Email', icon: HiMail },
  { id: FILTER_SMS, label: 'SMS', icon: HiChat },
];

const STATUS_BADGE_CLASSES = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  queued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function CampaignCard({ campaign, onEdit, onDelete }) {
  const isEmail = campaign.channel === 'email';
  const ChannelIcon = isEmail ? HiMail : HiChat;
  const dateIso = campaign.sent_at || campaign.updated_at || campaign.created_at;
  const dateStr = dateIso ? formatDate(String(dateIso).slice(0, 10), 'DD MMM YYYY') : '—';
  const recipientLabel = campaign.recipient_group === 'team' ? 'Team' : 'Clients';
  const statusBadge = STATUS_BADGE_CLASSES[campaign.status] || STATUS_BADGE_CLASSES.draft;

  return (
    <EntityCard
      icon={ChannelIcon}
      title={campaign.name || 'Untitled Campaign'}
      onSelect={() => onEdit(campaign.id)}
      onDelete={() => onDelete(campaign.id)}
      deleteTitle="Delete campaign"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
        <span className="capitalize">{campaign.channel}</span>
        <span>{recipientLabel}</span>
        <span>{campaign.audience_size ?? 0} recipients</span>
        {campaign.status && (
          <span className={`font-medium px-2 py-0.5 rounded capitalize ${statusBadge}`}>
            {campaign.status}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</p>
    </EntityCard>
  );
}

export default function MarketingPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketingSettings, setMarketingSettings] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getMarketingSettings(currentUser.uid.trim())
      .then(setMarketingSettings)
      .catch(() => setMarketingSettings(null));
  }, [currentUser?.uid]);

  const fetchCampaigns = useCallback(async () => {
    if (!currentUser?.uid || !orgResolved) return;
    setLoading(true);
    try {
      const res = await fetch('/api/get-marketing-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId: organization?.id || null,
        }),
      });
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, orgResolved, organization?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleEdit = useCallback((id) => {
    router.push(`/dashboard/marketing/${id}/edit`);
  }, [router]);

  const handleDelete = useCallback(async (campaignId) => {
    if (!currentUser?.uid) return;
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      await fetch('/api/delete-marketing-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, campaignId }),
      });
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch {
      console.error('Failed to delete campaign');
    }
  }, [currentUser?.uid]);

  const filteredCampaigns = useMemo(() => {
    if (activeFilter === FILTER_ALL) return campaigns;
    return campaigns.filter((c) => c.channel === activeFilter);
  }, [campaigns, activeFilter]);

  return (
    <>
      <Head>
        <title>Marketing Campaigns | GoManagr</title>
        <meta name="description" content="Create and manage SMS or email marketing campaigns." />
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
                Create, manage, and send email or SMS campaigns to your clients and team.
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
              <PrimaryButton
                type="button"
                className="gap-2 shadow-md"
                onClick={() => router.push('/dashboard/marketing/new')}
              >
                <HiPlus className="w-5 h-5" />
                Add Campaign
              </PrimaryButton>
            </div>
          </div>

          {/* Channel filter pills */}
          <div className="flex flex-wrap gap-2">
            {CHANNEL_FILTERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveFilter(id)}
                aria-pressed={activeFilter === id}
                className={`
                  inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  ${activeFilter === id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25 dark:bg-primary-500 dark:shadow-primary-600/30'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/20'
                  }
                `}
              >
                {Icon && <Icon className="w-5 h-5" aria-hidden />}
                {label}
              </button>
            ))}
          </div>

          {/* Campaigns list (unified cards) */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary-500" aria-hidden />
              Campaigns
              {!loading && filteredCampaigns.length > 0 && (
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({filteredCampaigns.length})
                </span>
              )}
            </h3>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-gray-700" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <EmptyState
                type="custom"
                title="No campaigns yet"
                description="Create your first campaign to get started. Drafts, sent, and completed campaigns will all appear here."
                icon={HiSpeakerphone}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCampaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>

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
