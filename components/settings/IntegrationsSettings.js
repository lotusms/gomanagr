'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const REVEAL_STORAGE_KEY = 'integrations-revealed';
const REVEAL_TTL_MS = 10 * 60 * 1000; // 10 minutes
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getUserOrganization } from '@/services/organizationService';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import InputField from '@/components/ui/InputField';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import EmptyState from '@/components/ui/EmptyState';
import ProviderStatusBadge from '@/components/marketing/ProviderStatusBadge';
import { HiCreditCard, HiSpeakerphone, HiMail, HiChat, HiLockClosed, HiLockOpen, HiX, HiEye, HiEyeOff } from 'react-icons/hi';

const PROVIDERS = [
  { id: 'smtp', name: 'SMTP', description: 'Send transactional email (invoices, receipts, proposals, invites) via your own SMTP server.', icon: HiMail, fields: [
    { key: 'host', label: 'SMTP host', placeholder: 'smtp.example.com', type: 'text' },
    { key: 'port', label: 'SMTP port', placeholder: '587', type: 'text' },
    { key: 'secure', label: 'Use TLS (port 465)', placeholder: 'true or false', type: 'text', optional: true },
    { key: 'user', label: 'SMTP user', placeholder: 'noreply@yourdomain.com', type: 'text' },
    { key: 'password', label: 'SMTP password', placeholder: '...', type: 'password' },
    { key: 'fromEmail', label: 'From email', placeholder: 'noreply@yourdomain.com', type: 'text' },
    { key: 'fromName', label: 'From name', placeholder: 'Your Company', type: 'text', optional: true },
  ]},
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email and optionally SMS via Mailchimp. Add your API key and server prefix.', icon: HiSpeakerphone, fields: [
    { key: 'apiKey', label: 'API key', placeholder: '...', type: 'password' },
    { key: 'serverPrefix', label: 'Server prefix (e.g. us21)', placeholder: 'us21', type: 'text' },
    { key: 'senderEmail', label: 'Sender email', placeholder: 'noreply@yourdomain.com', type: 'text' },
    { key: 'senderName', label: 'Sender name', placeholder: 'Your Company', type: 'text' },
    { key: 'fromNumber', label: 'From number (SMS, optional)', placeholder: '', type: 'text', optional: true },
  ]},
  { id: 'twilio', name: 'Twilio', description: 'Send SMS. Configure with your Twilio Account SID, Auth Token, and a Twilio phone number.', icon: HiChat, fields: [
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
function integrationStatusToBadgeStatus(status, testPassed = false) {
  if (status && String(status).toLowerCase() === 'connected') return 'connected';
  if (testPassed) return 'connected';
  if (!status) return 'not_connected';
  const s = String(status).toLowerCase();
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
  const [revealedProviders, setRevealedProviders] = useState({});
  const [pinModalProvider, setPinModalProvider] = useState(null);
  const [revealPin, setRevealPin] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [testPassedProviders, setTestPassedProviders] = useState({});
  const lockTimerRef = useRef(null);

  const clearRevealedStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(REVEAL_STORAGE_KEY);
    } catch (_) {}
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const lockAllRevealed = useCallback(() => {
    let ids = [];
    try {
      const raw = sessionStorage.getItem(REVEAL_STORAGE_KEY);
      if (raw) {
        const { configs } = JSON.parse(raw);
        ids = Object.keys(configs || {});
      }
    } catch (_) {}
    setRevealedProviders({});
    setFormValues((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = {};
      });
      return next;
    });
    clearRevealedStorage();
  }, [clearRevealedStorage]);

  const scheduleLock = useCallback((revealedAt) => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    const elapsed = Date.now() - revealedAt;
    const remaining = Math.max(0, REVEAL_TTL_MS - elapsed);
    if (remaining <= 0) {
      lockAllRevealed();
      return;
    }
    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null;
      lockAllRevealed();
    }, remaining);
  }, [lockAllRevealed]);

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

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // Restore revealed state from sessionStorage after load (keeps unlocked across refresh for up to 10 min)
  useEffect(() => {
    if (loading || !organizationId) return;
    try {
      const raw = sessionStorage.getItem(REVEAL_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const { revealedAt, organizationId: storedOrgId, configs } = data || {};
      if (storedOrgId !== organizationId || !configs || typeof revealedAt !== 'number') return;
      const elapsed = Date.now() - revealedAt;
      if (elapsed >= REVEAL_TTL_MS) {
        sessionStorage.removeItem(REVEAL_STORAGE_KEY);
        return;
      }
      setFormValues((prev) => ({ ...prev, ...configs }));
      setRevealedProviders((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(configs).map((id) => [id, true])) }));
      scheduleLock(revealedAt);
    } catch (_) {
      sessionStorage.removeItem(REVEAL_STORAGE_KEY);
    }
  }, [loading, organizationId, scheduleLock]);

  useEffect(() => {
    if (!pinModalProvider) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !revealLoading) closePinModal();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [pinModalProvider, revealLoading]);

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
      // Optimistically update status so badge shows "Connected" immediately
      const newStatus = data.status === 'connected' ? 'connected' : data.status;
      if (newStatus) {
        setIntegrations((prev) =>
          prev.some((i) => i.provider === providerId)
            ? prev.map((i) => (i.provider === providerId ? { ...i, status: newStatus } : i))
            : prev
        );
        setTestPassedProviders((prev) => ({ ...prev, [providerId]: false }));
      }
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
      setTestPassedProviders((prev) => ({ ...prev, [providerId]: true }));
      toast.success('Connection test passed. Click Save to store your settings.', 4000);
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

  const hasSavedCredentials = (providerId) => {
    const saved = integrations.find((i) => i.provider === providerId);
    return saved?.status === 'connected' || (saved?.metadata && Object.keys(saved.metadata || {}).length > 0);
  };

  const handleRevealClick = (providerId) => {
    if (revealedProviders[providerId]) {
      setRevealedProviders((prev) => ({ ...prev, [providerId]: false }));
      setFormValues((prev) => ({ ...prev, [providerId]: {} }));
      try {
        const raw = sessionStorage.getItem(REVEAL_STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.organizationId === organizationId && data.configs) {
            const { [providerId]: _, ...rest } = data.configs;
            if (Object.keys(rest).length === 0) {
              clearRevealedStorage();
            } else {
              sessionStorage.setItem(
                REVEAL_STORAGE_KEY,
                JSON.stringify({ ...data, configs: rest })
              );
            }
          }
        }
      } catch (_) {}
      return;
    }
    setPinModalProvider(providerId);
    setRevealPin('');
  };

  const handleRevealSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !organizationId || !pinModalProvider) return;
    const pinTrimmed = revealPin.trim();
    if (!pinTrimmed) {
      toast.error('Enter your PIN');
      return;
    }
    setRevealLoading(true);
    try {
      const res = await fetch('/api/integrations/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId,
          provider: pinModalProvider,
          pin: pinTrimmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        toast.error(data.error || 'Incorrect PIN');
        return;
      }
      if (data.config && typeof data.config === 'object') {
        const config = { ...data.config };
        setFormValues((prev) => ({ ...prev, [pinModalProvider]: config }));
        setRevealedProviders((prev) => ({ ...prev, [pinModalProvider]: true }));
        const revealedAt = Date.now();
        try {
          const raw = sessionStorage.getItem(REVEAL_STORAGE_KEY);
          const existing = raw ? JSON.parse(raw) : {};
          const merged = existing.organizationId === organizationId && existing.configs
            ? { ...existing.configs, [pinModalProvider]: config }
            : { [pinModalProvider]: config };
          sessionStorage.setItem(
            REVEAL_STORAGE_KEY,
            JSON.stringify({ revealedAt, organizationId, configs: merged })
          );
        } catch (_) {}
        scheduleLock(revealedAt);
      }
      setPinModalProvider(null);
      setRevealPin('');
      toast.success('Credentials displayed. Stays unlocked for 10 minutes or until you lock.');
    } catch (err) {
      toast.error(err.message || 'Failed to load credentials');
    } finally {
      setRevealLoading(false);
    }
  };

  const closePinModal = () => {
    if (!revealLoading) {
      setPinModalProvider(null);
      setRevealPin('');
    }
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
          const badgeStatus = integrationStatusToBadgeStatus(saved?.status, testPassedProviders[provider.id]);
          return (
            <CollapsibleSection
              key={provider.id}
              title={provider.name}
              isOpen={isOpen}
              onToggle={() => toggleSection(provider.id)}
              icon={<Icon className="w-5 h-5" aria-hidden />}
              trailing={
                <div className="flex items-center gap-2">
                  {hasSavedCredentials(provider.id) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevealClick(provider.id);
                      }}
                      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={revealedProviders[provider.id] ? 'Hide credentials' : 'Show saved credentials (requires PIN)'}
                      aria-label={revealedProviders[provider.id] ? 'Hide credentials' : 'Show saved credentials'}
                    >
                      {revealedProviders[provider.id] ? (
                        <HiLockOpen className="w-5 h-5" aria-hidden />
                      ) : (
                        <HiLockClosed className="w-5 h-5" aria-hidden />
                      )}
                    </button>
                  )}
                  <ProviderStatusBadge status={badgeStatus} />
                </div>
              }
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{provider.description}</p>
              {provider.id === 'mailchimp' && (() => {
                const prefix = (formValues.mailchimp?.serverPrefix || '').trim()
                  || (saved?.metadata_json?.serverPrefix || saved?.metadata?.serverPrefix || '').toString().trim()
                  || '';
                return (
                  <div className="mb-4 rounded-lg border border-primary-200 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/10 p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Template-based emails are created and sent in Mailchimp. GoManagr syncs your clients to the{' '}
                      <strong>GoManagr Contacts</strong> audience (from Marketing or when you save clients) so you can target them in Mailchimp.{' '}
                      <a
                        href={`https://${prefix || 'us21'}.admin.mailchimp.com/campaigns/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 underline font-medium hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Open Mailchimp Campaigns
                      </a>
                    </p>
                  </div>
                );
              })()}
              {saved?.status === 'connected' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Credentials are stored securely. Enter new values only to update.
                </p>
              )}
              <div className="space-y-4">
                {provider.fields.map((field) => {
                  const isSaved = saved?.status === 'connected' || (saved?.metadata && Object.keys(saved.metadata).length > 0);
                  const value = formValues[provider.id]?.[field.key] ?? '';
                  // Optional fields left empty: no "Saved" or dots placeholder so it's clear nothing was entered
                  const savedPlaceholder = isSaved && !field.optional
                    ? (field.type === 'password' || field.key?.toLowerCase().includes('key') || field.key?.toLowerCase().includes('token')
                        ? '••••••••••••••••••••••••••••••••'
                        : provider.id === 'stripe' && field.key === 'publishableKey' && saved?.metadata?.publishableKeySuffix
                          ? `pk_••••${saved.metadata.publishableKeySuffix}`
                          : '••••••••••••••••••••••••••••••••')
                    : field.optional
                      ? (field.placeholder ?? '')
                      : null;
                  const handleFieldChange = (e) => {
                    const v = e.target.value;
                    setField(provider.id, field.key, v);
                    if (provider.id === 'mailchimp' && field.key === 'apiKey') {
                      const prefix = v.trim().split('-')[1];
                      if (prefix) setField(provider.id, 'serverPrefix', prefix);
                    }
                  };
                  const fieldId = `integrations-${provider.id}-${field.key}`;
                  const isSecret =
                    field.type === 'password' ||
                    /key|token|secret/.test((field.key || '').toLowerCase());
                  const isVisible = !!visibleSecrets[fieldId];
                  const inputType = isSecret ? (isVisible ? 'text' : 'password') : (field.type || 'text');
                  const toggleSecret = () =>
                    setVisibleSecrets((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
                  return (
                    <InputField
                      key={field.key}
                      id={fieldId}
                      label={field.label}
                      sublabel={field.help}
                      value={value}
                      onChange={handleFieldChange}
                      placeholder={savedPlaceholder != null ? savedPlaceholder : field.placeholder}
                      type={inputType}
                      required={!field.optional}
                      variant="light"
                      icon={
                        isSecret ? (
                          <button
                            type="button"
                            onClick={toggleSecret}
                            className="p-0.5 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label={isVisible ? 'Hide value' : 'Show value'}
                            tabIndex={-1}
                          >
                            {isVisible ? (
                              <HiEyeOff className="w-5 h-5" aria-hidden />
                            ) : (
                              <HiEye className="w-5 h-5" aria-hidden />
                            )}
                          </button>
                        ) : undefined
                      }
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

      {pinModalProvider && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <button
            type="button"
            onClick={closePinModal}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close"
            disabled={revealLoading}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <HiLockClosed className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Show credentials</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Enter your credentials reveal PIN to display saved values for this integration.
                  </p>
                </div>
              </div>
              {!revealLoading && (
                <button
                  type="button"
                  onClick={closePinModal}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              )}
            </div>
            <form onSubmit={handleRevealSubmit} className="space-y-4">
              <InputField
                id="integrations-reveal-pin"
                label="PIN"
                type="password"
                value={revealPin}
                onChange={(e) => setRevealPin(e.target.value)}
                placeholder="Enter your PIN"
                variant="light"
                autoComplete="off"
              />
              <div className="flex justify-end gap-3 pt-2">
                <SecondaryButton type="button" onClick={closePinModal} disabled={revealLoading}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={revealLoading || !revealPin.trim()}>
                  {revealLoading ? 'Verifying…' : 'Show credentials'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
