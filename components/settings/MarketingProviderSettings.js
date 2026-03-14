'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Dropdown } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { getMarketingSettings, saveMarketingSettings } from '@/lib/marketing/marketingSettingsService';
import { getProviderCapabilities } from '@/lib/marketing/providerRegistry';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';
import ProviderConfigCard from '@/components/marketing/ProviderConfigCard';
import Table from '@/components/ui/Table';
import { HiSpeakerphone } from 'react-icons/hi';

export default function MarketingProviderSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getMarketingSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <HiSpeakerphone className="w-5 h-5 text-primary-500 dark:text-primary-400" aria-hidden />
          Marketing providers
        </h3>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton asChild>
            <Link href="/dashboard/marketing">Go to Marketing</Link>
          </SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Configure email and SMS providers for campaigns. Set defaults per channel and test connections.
      </p>

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

      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Provider setup</h4>
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
      </div>
    </div>
  );
}
