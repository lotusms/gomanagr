'use client';

import { useState } from 'react';
import InputField from '@/components/ui/InputField';
import Switch from '@/components/ui/Switch';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import ProviderStatusBadge from './ProviderStatusBadge';
import ProviderCapabilityBadges from './ProviderCapabilityBadges';
import { getProviderCapabilities, validateProviderConfig } from '@/lib/marketing/providerRegistry';
import { PROVIDER_TYPES } from '@/lib/marketing/types';
import { PROVIDER_DISPLAY_NAMES } from '@/lib/marketing/providerRegistry';

/**
 * @param {{
 *   config: import('@/lib/marketing/types').MarketingProviderConfig,
 *   onChange: (config: import('@/lib/marketing/types').MarketingProviderConfig) => void,
 *   onTestConnection?: () => Promise<void>,
 *   isDefaultEmail?: boolean,
 *   isDefaultSms?: boolean,
 * }} props
 */
export default function ProviderConfigCard({
  config,
  onChange,
  onTestConnection,
  isDefaultEmail,
  isDefaultSms,
}) {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const update = (partial) => onChange({ ...config, ...partial });
  const capabilities = getProviderCapabilities(config);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const v = await validateProviderConfig(config);
      setStatus(v.status || (v.valid ? 'connected' : 'not_connected'));
      if (onTestConnection) await onTestConnection();
    } finally {
      setTesting(false);
    }
  };

  const displayName = PROVIDER_DISPLAY_NAMES[config.providerType] || config.providerType;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</h3>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <ProviderCapabilityBadges capabilities={capabilities} />
            {status && (
              <ProviderStatusBadge status={status} />
            )}
            {isDefaultEmail && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Default for email</span>
            )}
            {isDefaultSms && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Default for SMS</span>
            )}
          </div>
        </div>
        <Switch
          id={`${config.providerType}-enabled`}
          label="Enabled"
          checked={config.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      <div className="space-y-4">
        <InputField
          id={`${config.providerType}-apiKey`}
          label={config.providerType === PROVIDER_TYPES.TWILIO ? 'Account SID' : 'API Key'}
          type="password"
          value={config.apiKey || ''}
          onChange={(e) => update({ apiKey: e.target.value })}
          placeholder={config.providerType === PROVIDER_TYPES.TWILIO ? 'AC...' : 'API key'}
          variant="light"
        />

        {(config.providerType === PROVIDER_TYPES.TWILIO || config.providerType === PROVIDER_TYPES.MAILCHIMP) && (
          <InputField
            id={`${config.providerType}-apiSecret`}
            label={config.providerType === PROVIDER_TYPES.TWILIO ? 'Auth Token' : 'API Secret (optional)'}
            type="password"
            value={config.apiSecret || ''}
            onChange={(e) => update({ apiSecret: e.target.value })}
            placeholder="Secret"
            variant="light"
          />
        )}

        {(config.providerType === PROVIDER_TYPES.RESEND || config.providerType === PROVIDER_TYPES.MAILCHIMP) && (
          <>
            <InputField
              id={`${config.providerType}-senderEmail`}
              label="Sender email"
              type="email"
              value={config.senderEmail || ''}
              onChange={(e) => update({ senderEmail: e.target.value })}
              placeholder="noreply@yourdomain.com"
              variant="light"
            />
            <InputField
              id={`${config.providerType}-senderName`}
              label="Sender name"
              type="text"
              value={config.senderName || ''}
              onChange={(e) => update({ senderName: e.target.value })}
              placeholder="Your Company"
              variant="light"
            />
          </>
        )}

        {(config.providerType === PROVIDER_TYPES.TWILIO || config.providerType === PROVIDER_TYPES.MAILCHIMP) && (
          <InputField
            id={`${config.providerType}-fromNumber`}
            label="From number (SMS)"
            type="tel"
            value={config.fromNumber || ''}
            onChange={(e) => update({ fromNumber: e.target.value })}
            placeholder="+1234567890"
            variant="light"
          />
        )}

        {config.providerType === PROVIDER_TYPES.MAILCHIMP && (
          <Switch
            id={`${config.providerType}-smsEnabled`}
            label="Enable SMS (if your Mailchimp account has SMS approved)"
            checked={config.smsEnabled === true}
            onCheckedChange={(checked) => update({ smsEnabled: checked })}
          />
        )}

        {config.notes && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{config.notes}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <SecondaryButton
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !config.enabled}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
