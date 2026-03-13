import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrganization } from '@/services/organizationService';
import { isOwnerOrDeveloperRole } from '@/config/rolePermissions';
import { PageHeader, Dropdown } from '@/components/ui';
import { SecondaryButton, PrimaryButton } from '@/components/ui/buttons';
import { getMarketingSettings, saveMarketingSettings } from '@/lib/marketing/marketingSettingsService';
import { getProviderCapabilities, validateProviderConfig } from '@/lib/marketing/providerRegistry';
import { PROVIDER_TYPES } from '@/lib/marketing/types';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';
import ProviderConfigCard from '@/components/marketing/ProviderConfigCard';
import ProviderStatusBadge from '@/components/marketing/ProviderStatusBadge';
import ProviderCapabilityBadges from '@/components/marketing/ProviderCapabilityBadges';
import Table from '@/components/ui/Table';
import { HiArrowLeft } from 'react-icons/hi';

export default function MarketingSettingsPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setAccessChecked(true);
      setHasAccess(false);
      return;
    }
    getUserOrganization(currentUser.uid)
      .then((org) => {
        const role = org?.membership?.role;
        const allowed = isOwnerOrDeveloperRole(role);
        setHasAccess(allowed);
        if (!allowed) {
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        setHasAccess(false);
        router.replace('/dashboard');
      })
      .finally(() => setAccessChecked(true));
  }, [currentUser?.uid, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getMarketingSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess, load]);

  const handleProviderChange = (providerType, nextConfig) => {
    if (!settings) return;
    const providers = settings.providers.map((p) =>
      p.providerType === providerType ? nextConfig : p
    );
    setSettings({ ...settings, providers });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await saveMarketingSettings(settings);
    setSaving(false);
  };

  const setDefaultEmail = (e) => {
    const v = e.target.value;
    setSettings((s) => (s ? { ...s, defaultEmailProvider: v || undefined } : s));
  };
  const setDefaultSms = (e) => {
    const v = e.target.value;
    setSettings((s) => (s ? { ...s, defaultSmsProvider: v || undefined } : s));
  };


  if (!accessChecked || !hasAccess) {
    return (
      <>
        <Head><title>Marketing Providers | GoManagr</title></Head>
        <div className="space-y-6">
          <p className="text-gray-500 dark:text-gray-400">{accessChecked && !hasAccess ? 'You don’t have access to this page.' : 'Loading…'}</p>
        </div>
      </>
    );
  }

  if (loading || !settings) {
    return (
      <>
        <Head><title>Marketing Providers | GoManagr</title></Head>
        <div className="space-y-6">
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        </div>
      </>
    );
  }

  const matrixData = settings.providers.map((p) => {
    const caps = getProviderCapabilities(p);
    return {
      id: p.providerType,
      provider: PROVIDER_DISPLAY_NAMES[p.providerType] || p.providerType,
      email: caps.email,
      sms: caps.sms,
      enabled: p.enabled,
      defaultEmail: settings.defaultEmailProvider === p.providerType,
      defaultSms: settings.defaultSmsProvider === p.providerType,
    };
  });

  return (
    <>
      <Head>
        <title>Marketing Providers | GoManagr</title>
        <meta name="description" content="Configure email and SMS marketing providers." />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Marketing Providers"
          description="Configure and enable email and SMS providers. Set defaults per channel and test connections."
          actions={
            <div className="flex flex-wrap gap-2">
              <SecondaryButton asChild className="gap-2">
                <Link href="/dashboard/marketing" className="inline-flex items-center justify-center gap-2">
                  <HiArrowLeft className="w-4 h-4" />
                  Back to Marketing
                </Link>
              </SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save settings'}
              </PrimaryButton>
            </div>
          }
        />

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Default providers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Choose which provider to use when sending email or SMS campaigns.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <Dropdown
              id="default-email-provider"
              label="Default email provider"
              value={settings.defaultEmailProvider || ''}
              onChange={setDefaultEmail}
              options={[
                { value: '', label: 'None' },
                ...settings.providers
                  .filter((p) => getProviderCapabilities(p).email)
                  .map((p) => ({ value: p.providerType, label: PROVIDER_DISPLAY_NAMES[p.providerType] || p.providerType })),
              ]}
              placeholder="None"
              searchable={false}
            />
            <Dropdown
              id="default-sms-provider"
              label="Default SMS provider"
              value={settings.defaultSmsProvider || ''}
              onChange={setDefaultSms}
              options={[
                { value: '', label: 'None' },
                ...settings.providers
                  .filter((p) => getProviderCapabilities(p).sms)
                  .map((p) => ({ value: p.providerType, label: PROVIDER_DISPLAY_NAMES[p.providerType] || p.providerType })),
              ]}
              placeholder="None"
              searchable={false}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Capability matrix</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <Table
              ariaLabel="Provider capabilities"
              columns={[
                { key: 'provider', label: 'Provider' },
                { key: 'email', label: 'Email', render: (r) => (r.email ? 'Yes' : '—') },
                { key: 'sms', label: 'SMS', render: (r) => (r.sms ? 'Yes' : '—') },
                { key: 'enabled', label: 'Enabled', render: (r) => (r.enabled ? 'Yes' : 'No') },
                { key: 'defaultEmail', label: 'Default (email)', render: (r) => (r.defaultEmail ? 'Default' : '—') },
                { key: 'defaultSms', label: 'Default (SMS)', render: (r) => (r.defaultSms ? 'Default' : '—') },
              ]}
              data={matrixData}
              getRowKey={(r) => r.id}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Provider setup</h2>
          <div className="space-y-6">
            {settings.providers.map((providerConfig) => (
              <ProviderConfigCard
                key={providerConfig.providerType}
                config={providerConfig}
                onChange={(next) => handleProviderChange(providerConfig.providerType, next)}
                isDefaultEmail={settings.defaultEmailProvider === providerConfig.providerType}
                isDefaultSms={settings.defaultSmsProvider === providerConfig.providerType}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
