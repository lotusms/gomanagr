'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import InputField from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/buttons';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import ProviderStatusBadge from '@/components/marketing/ProviderStatusBadge';
import { HiLockClosed, HiCheck } from 'react-icons/hi';

const PIN_MIN = 4;
const PIN_MAX = 8;

const CREDENTIALS_PIN_SECTION_ID = 'credentials-pin';

export default function SecuritySettings() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [pinStatus, setPinStatus] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState(CREDENTIALS_PIN_SECTION_ID);

  const loadStatus = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings/reveal-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, action: 'status' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPinStatus(data.isSet === true);
      else setPinStatus(false);
    } catch {
      setPinStatus(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSetPin = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    const trimmed = (pin || '').trim();
    if (trimmed.length < PIN_MIN || trimmed.length > PIN_MAX) {
      toast.error(`PIN must be ${PIN_MIN}–${PIN_MAX} characters`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/reveal-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, action: 'set', pin: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save PIN');
      toast.success('Credentials reveal PIN saved.');
      setPin('');
      setPinStatus(true);
    } catch (err) {
      toast.error(err.message || 'Failed to save PIN');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const badgeStatus = pinStatus === true ? 'connected' : 'not_connected';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Security</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage password, two-factor authentication, and credentials reveal PIN.
        </p>
      </div>

      <div className="space-y-4">
        <CollapsibleSection
          title="Credentials reveal PIN"
          isOpen={openSection === CREDENTIALS_PIN_SECTION_ID}
          onToggle={() => toggleSection(CREDENTIALS_PIN_SECTION_ID)}
          icon={<HiLockClosed className="w-5 h-5" aria-hidden />}
          trailing={<ProviderStatusBadge status={badgeStatus} />}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Used to show saved integration credentials (e.g. Mailchimp API key, Stripe keys) in Integrations. Enter this PIN when you click the lock icon there to view real values. Set a {PIN_MIN}–{PIN_MAX} character PIN below.
          </p>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <form onSubmit={handleSetPin} className="space-y-4 max-w-sm">
              {pinStatus && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <HiCheck className="w-4 h-4 flex-shrink-0" aria-hidden />
                  PIN is set. You can change it by entering a new PIN and clicking Set PIN.
                </p>
              )}
              <InputField
                id="security-reveal-pin"
                label="PIN"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={pinStatus ? 'Enter new PIN to change' : `${PIN_MIN}–${PIN_MAX} characters`}
                variant="light"
                autoComplete="off"
              />
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? 'Saving…' : pinStatus ? 'Change PIN' : 'Set PIN'}
              </PrimaryButton>
            </form>
          )}
        </CollapsibleSection>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm">More security options coming soon…</p>
    </div>
  );
}
