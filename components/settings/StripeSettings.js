'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import InputField from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';

const PLACEHOLDER_SECRET = '••••••••••••';

export default function StripeSettings() {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [paymentMethodConfigId, setPaymentMethodConfigId] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ userId: currentUser.uid });
      const res = await fetch(`/api/settings/stripe?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setConfig(data);
      setPublishableKey(data.publishableKey || '');
      setSecretKey('');
      setWebhookSecret('');
      setPaymentMethodConfigId(data.paymentMethodConfigId || '');
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const body = {
        userId: currentUser.uid,
        publishableKey: publishableKey.trim() || undefined,
        paymentMethodConfigId: paymentMethodConfigId.trim() || undefined,
      };
      if (secretKey.trim()) body.secretKey = secretKey.trim();
      if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();

      const res = await fetch('/api/settings/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSaveSuccess(true);
      setSecretKey('');
      setWebhookSecret('');
      await load();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const secretKeyConfigured = !!(config?.secretKeyMasked);
  const webhookSecretConfigured = !!(config?.webhookSecretMasked);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!currentUser?.uid) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe</h3>
        <p className="text-sm text-amber-600 dark:text-amber-400">Sign in to manage Stripe settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Payment and billing (invoices, checkout, webhooks). Stored securely and used by the app in place of environment variables when set.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <HiCheckCircle className="w-5 h-5 flex-shrink-0" />
          Settings saved.
        </div>
      )}

      <div className="grid gap-4 max-w-2xl">
        <InputField
          id="stripe-publishable-key"
          label="Publishable key"
          type="text"
          value={publishableKey}
          onChange={(e) => setPublishableKey(e.target.value)}
          placeholder="pk_test_… or pk_live_…"
          sublabel="Used in the browser for Stripe.js (payment page). Safe to expose."
          variant="light"
          autoComplete="off"
        />
        <InputField
          id="stripe-secret-key"
          label="Secret key"
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder={secretKeyConfigured ? PLACEHOLDER_SECRET : 'sk_test_… or sk_live_…'}
          sublabel="Used on the server. Keep private. Leave blank to keep current value."
          variant="light"
          autoComplete="new-password"
        />
        {secretKeyConfigured && (
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 flex items-center gap-1">
            <HiCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden />
            Secret key is set. Enter a new value only to change it.
          </p>
        )}
        <InputField
          id="stripe-webhook-secret"
          label="Webhook secret"
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder={webhookSecretConfigured ? PLACEHOLDER_SECRET : 'whsec_…'}
          sublabel="Used to verify Stripe webhook signatures. Leave blank to keep current value."
          variant="light"
          autoComplete="new-password"
        />
        {webhookSecretConfigured && (
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 flex items-center gap-1">
            <HiCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden />
            Webhook secret is set. Enter a new value only to change it.
          </p>
        )}
        <InputField
          id="stripe-payment-method-config"
          label="Payment method configuration ID (optional)"
          type="text"
          value={paymentMethodConfigId}
          onChange={(e) => setPaymentMethodConfigId(e.target.value)}
          placeholder="pmc_…"
          sublabel="Stripe Payment Method Configuration for card-only or custom methods."
          variant="light"
          autoComplete="off"
        />
      </div>

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </PrimaryButton>
        {!config?.publishableKey && !config?.secretKeyMasked && (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <HiXCircle className="w-4 h-4 flex-shrink-0" />
            Add at least publishable and secret key to enable payments.
          </p>
        )}
      </div>
    </div>
  );
}
