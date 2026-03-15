'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { Dropdown, useCancelWithConfirm } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { getMarketingSettings, saveMarketingSettings } from '@/lib/marketing/marketingSettingsService';
import { getProviderCapabilities } from '@/lib/marketing/providerRegistry';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';
import Table from '@/components/ui/Table';
import { HiSpeakerphone } from 'react-icons/hi';

export default function MarketingProviderSettings({ embedInMarketingPage = false, hideNavigateToIntegrations = false } = {}) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const navigateToIntegrations = useCallback(() => {
    router.push('/dashboard/settings?section=integrations');
  }, [router]);

  const { handleCancel: handleGoToConfigurations, discardDialog } = useCancelWithConfirm(
    navigateToIntegrations,
    hasChanges
  );

  const load = useCallback(async () => {
    setLoading(true);
    setSaveError(null);
    setHasChanges(false);
    if (!currentUser?.uid) {
      setSettings(null);
      setLoading(false);
      return;
    }
    const userId = currentUser.uid.trim();
    const s = await getMarketingSettings(userId);
    setSettings(s);
    setLoading(false);
  }, [currentUser?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleProviderChange = (providerType, nextConfig) => {
    if (!settings) return;
    setHasChanges(true);
    const providers = settings.providers.map((p) =>
      p.providerType === providerType ? nextConfig : p
    );
    setSettings({ ...settings, providers });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    try {
      const userId = currentUser?.uid?.trim() || null;
      await saveMarketingSettings(settings, userId);
      setHasChanges(false);
    } catch (e) {
      setSaveError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setDefaultEmail = (e) => {
    const v = e.target.value;
    setHasChanges(true);
    setSettings((s) => (s ? { ...s, defaultEmailProvider: v || undefined } : s));
  };
  const setDefaultSms = (e) => {
    const v = e.target.value;
    setHasChanges(true);
    setSettings((s) => (s ? { ...s, defaultSmsProvider: v || undefined } : s));
  };

  if (loading || !settings) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!embedInMarketingPage && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HiSpeakerphone className="w-5 h-5 text-primary-500 dark:text-primary-400" aria-hidden />
            Marketing providers
          </h3>
        )}
      </div>

      {saveError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {saveError}
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Default providers</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
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
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Capability matrix</h4>
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
      </div>

      <div className="flex flex-wrap gap-2 w-full justify-end">
        {!hideNavigateToIntegrations && !embedInMarketingPage && (
          <SecondaryButton type="button" onClick={handleGoToConfigurations}>
            Go to Configurations
          </SecondaryButton>
        )}
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
      {!hideNavigateToIntegrations && !embedInMarketingPage && discardDialog}
    </div>
  );
}
