'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getUserOrganization } from '@/services/organizationService';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import InputField from '@/components/ui/InputField';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import EmptyState from '@/components/ui/EmptyState';
import ProviderStatusBadge from '@/components/marketing/ProviderStatusBadge';
import { HiCreditCard, HiSpeakerphone, HiMail } from 'react-icons/hi';

const PROVIDERS = [
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email and optionally SMS via Mailchimp. Add your API key and server prefix.', icon: HiMail, fields: [
    { key: 'apiKey', label: 'API key', placeholder: '...', type: 'password' },
    { key: 'serverPrefix', label: 'Server prefix (e.g. us21)', placeholder: 'us21', type: 'text' },
    { key: 'senderEmail', label: 'Sender email', placeholder: 'noreply@yourdomain.com', type: 'text' },
    { key: 'senderName', label: 'Sender name', placeholder: 'Your Company', type: 'text' },
    { key: 'fromNumber', label: 'From number (SMS, optional)', placeholder: '', type: 'text', optional: true },
  ]},
  { id: 'twilio', name: 'Twilio', description: 'Send SMS. Configure with your Twilio Account SID, Auth Token, and a Twilio phone number.', icon: HiSpeakerphone, fields: [
    { key: 'accountSid', label: 'Account SID', placeholder: 'AC...', type: 'text' },
    { key: 'authToken', label: 'Auth Token', placeholder: '...', type: 'password' },
    { key: 'fromNumber', label: 'From phone number', placeholder: '+1234567890', type: 'text' },
  ]},
  { id: 'resend', name: 'Resend', description: 'Send transactional email. Add your Resend API key and verify your sender domain.', icon: HiMail, fields: [
    { key: 'apiKey', label: 'API key', placeholder: 're_...', type: 'password' },
    { key: 'senderEmail', label: 'Sender email', placeholder: 'onboarding@resend.dev', type: 'text' },
    { key: 'senderName', label: 'Sender name', placeholder: 'Your Company', type: 'text' },
  ]},
  { id: 'stripe', name: 'Stripe', description: 'Accept payments and manage invoices. Enter your Stripe API keys from the Stripe Dashboard.', icon: HiCreditCard, fields: [
    { key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_...', type: 'text' },
    { key: 'secretKey', label: 'Secret key', placeholder: 'sk_live_...', type: 'password' },
    { key: 'webhookSecret', label: 'Webhook secret (optional)', placeholder: 'whsec_...', type: 'password', optional: true },
    { key: 'paymentMethodConfigId', label: 'Payment method configuration ID (optional)', placeholder: '', type: 'text', optional: true },
  ]},
];

/** Map integration API status to ProviderStatusBadge status (connected, not_connected, misconfigured). */
function integrationStatusToBadgeStatus(status) {
  if (!status) return 'not_connected';
  const s = status.toLowerCase();
  if (s === 'connected') return 'connected';
  if (s === 'invalid') return 'misconfigured';
  return 'not_connected';
}

export default function IntegrationsSettings() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [organizationId, setOrganizationId] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [testing, setTesting] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [openProvider, setOpenProvider] = useState(null);

  const load = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const org = await getUserOrganization(currentUser.uid);
      if (!org?.id) {
        setIntegrations([]);
        setOrganizationId(null);
        setLoading(false);
        return;
      }
      setOrganizationId(org.id);
      const params = new URLSearchParams({ userId: currentUser.uid, organizationId: org.id });
      const res = await fetch(`/api/integrations?${params}`);
      if (!res.ok) throw new Error('Failed to load integrations');
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (providerId) => {
    if (!currentUser?.uid || !organizationId) return;
    const config = formValues[providerId] || {};
    const hasValues = Object.values(config).some((v) => v != null && String(v).trim() !== '');
    const saved = integrations.find((i) => i.provider === providerId);
    if (saved?.status === 'connected' && !hasValues) {
      toast.info('Enter new values to update, or leave as is.');
      return;
    }
    setSaving(providerId);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId,
          provider: providerId,
          action: 'save',
          config,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Saved successfully.', 3000);
      setFormValues((prev) => ({ ...prev, [providerId]: {} }));
      await load();
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (providerId) => {
    if (!currentUser?.uid || !organizationId) return;
    setTesting(providerId);
    try {
      const config = formValues[providerId] || {};
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId,
          provider: providerId,
          action: 'test',
          config: Object.keys(config).length ? config : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Test failed');
      if (!data.ok) throw new Error(data.error || 'Connection failed');
      toast.success('Connection test passed.', 3000);
    } catch (e) {
      toast.error(e.message || 'Test failed');
    } finally {
      setTesting(null);
    }
  };

  const setField = (providerId, key, value) => {
    setFormValues((prev) => ({
      ...prev,
      [providerId]: { ...(prev[providerId] || {}), [key]: value },
    }));
  };

  const toggleSection = (providerId) => {
    setOpenProvider((prev) => (prev === providerId ? null : providerId));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Integrations</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Per-org Stripe and marketing providers for your organization.</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Integrations</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Connect third-party services for your organization.</p>
        </div>
        <EmptyState
          type="custom"
          title="Organization required"
          description="You need to create or join an organization to configure its Stripe and email/SMS integrations."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Integrations</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Per-organization only: Stripe and email/SMS providers for this org to charge its clients and communicate within the org. Not shared across organizations.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const saved = integrations.find((i) => i.provider === provider.id);
          const Icon = provider.icon;
          const isOpen = openProvider === provider.id;
          const badgeStatus = integrationStatusToBadgeStatus(saved?.status);
          return (
            <CollapsibleSection
              key={provider.id}
              title={provider.name}
              isOpen={isOpen}
              onToggle={() => toggleSection(provider.id)}
              icon={<Icon className="w-5 h-5" aria-hidden />}
              trailing={<ProviderStatusBadge status={badgeStatus} />}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{provider.description}</p>
              {saved?.status === 'connected' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Credentials are stored securely. Enter new values only to update.
                </p>
              )}
              <div className="space-y-4">
                {provider.fields.map((field) => {
                  const isSaved = saved?.status === 'connected' || (saved?.metadata && Object.keys(saved.metadata).length > 0);
                  const savedPlaceholder = isSaved
                    ? (field.type === 'password' || field.key?.toLowerCase().includes('key') || field.key?.toLowerCase().includes('token')
                        ? '•••••••• (leave blank to keep)'
                        : provider.id === 'stripe' && field.key === 'publishableKey' && saved?.metadata?.publishableKeySuffix
                          ? `pk_••••${saved.metadata.publishableKeySuffix}`
                          : 'Saved')
                    : null;
                  const handleFieldChange = (e) => {
                    const value = e.target.value;
                    setField(provider.id, field.key, value);
                    if (provider.id === 'mailchimp' && field.key === 'apiKey') {
                      const prefix = value.trim().split('-')[1];
                      if (prefix) setField(provider.id, 'serverPrefix', prefix);
                    }
                  };
                  return (
                    <InputField
                      key={field.key}
                      id={`integrations-${provider.id}-${field.key}`}
                      label={field.label}
                      value={formValues[provider.id]?.[field.key] ?? ''}
                      onChange={handleFieldChange}
                      placeholder={savedPlaceholder || field.placeholder}
                      type={field.type || 'text'}
                      required={!field.optional}
                      variant="light"
                    />
                  );
                })}
                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <SecondaryButton
                    onClick={() => handleTest(provider.id)}
                    disabled={testing !== null}
                  >
                    {testing === provider.id ? 'Testing…' : 'Test connection'}
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={() => handleSave(provider.id)}
                    disabled={saving !== null}
                  >
                    {saving === provider.id ? 'Saving…' : 'Save'}
                  </PrimaryButton>
                </div>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}
