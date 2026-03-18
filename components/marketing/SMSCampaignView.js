'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import RecipientSelector from './RecipientSelector';
import CampaignHistoryTable from './CampaignHistoryTable';
import ProviderWarningBanner from './ProviderWarningBanner';
import ProviderInfoCard from './ProviderInfoCard';
import { RECIPIENT_GROUPS, AUDIENCE_MODES, SMS_SEGMENT_LENGTH } from '@/lib/marketingTypes';

import { getActiveProviderForChannel, getProviderCapabilities, sendCampaign as registrySendCampaign, sendTestMessage } from '@/lib/marketing/providerRegistry';
import { MARKETING_CHANNELS } from '@/lib/marketing/types';
import { HiPlus } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import TextareaInput from '@/components/ui/TextareaInput';
import Dropdown from '@/components/ui/Dropdown';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';

const VARIABLE_OPTIONS = [
  { value: 'first_name', label: 'First name' },
  { value: 'company_name', label: 'Company name' },
];

function getRecipientCount(recipientGroup, audienceMode, selectedIds, options) {
  if (audienceMode === AUDIENCE_MODES.ALL) return options.length;
  return selectedIds.length;
}

function buildSmsRecipients(recipientsList, audienceMode, selectedIds) {
  const subset = audienceMode === AUDIENCE_MODES.SELECTED && selectedIds.length
    ? recipientsList.filter((r) => selectedIds.includes(r.id))
    : recipientsList;
  return subset.map((r) => ({ id: r.id, phone: r.phone || r.email, name: r.name }));
}

export default function SMSCampaignView({ showPageHeader = true, userId = null }) {
  const { account } = useUserAccount();
  const [campaignName, setCampaignName] = useState('');
  const [recipientGroup, setRecipientGroup] = useState(RECIPIENT_GROUPS.CLIENTS);
  const [audienceMode, setAudienceMode] = useState(AUDIENCE_MODES.ALL);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [variableSelectValue, setVariableSelectValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [providerChecked, setProviderChecked] = useState(false);
  const [organization, setOrganization] = useState(undefined);
  const [recipientsList, setRecipientsList] = useState([]);

  const industry = organization?.industry ?? account?.industry ?? null;
  const clientLabel = getTermForIndustry(industry, 'client');
  const teamMemberLabel = getTermForIndustry(industry, 'teamMember');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getUserOrganization(userId)
      .then((org) => { if (!cancelled) setOrganization(org || null); })
      .catch(() => { if (!cancelled) setOrganization(null); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId || organization === undefined) return;
    let cancelled = false;
    setRecipientsList([]);

    if (recipientGroup === RECIPIENT_GROUPS.CLIENTS) {
      if (organization?.id) {
        fetch('/api/get-org-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (cancelled) return;
            setRecipientsList(
              (data?.clients || []).map((c) => ({
                id: c.id,
                name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id,
                email: c.email || '',
                phone: c.phone || '',
              }))
            );
          })
          .catch(() => { if (!cancelled) setRecipientsList([]); });
      } else {
        getUserAccount(userId)
          .then((acct) => {
            if (cancelled) return;
            const clients = Array.isArray(acct?.clients) ? acct.clients : [];
            setRecipientsList(
              clients.map((c) => ({
                id: c.id,
                name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id,
                email: c.email || '',
                phone: c.phone || '',
              }))
            );
          })
          .catch(() => { if (!cancelled) setRecipientsList([]); });
      }
    } else {
      if (organization?.id) {
        fetch('/api/get-org-team-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: organization.id, callerUserId: userId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (cancelled) return;
            setRecipientsList(
              (data?.teamMembers || []).map((m) => ({
                id: m.id || m.user_id,
                name: m.name || m.displayName || m.email || m.id,
                email: m.email || '',
                phone: '',
              }))
            );
          })
          .catch(() => { if (!cancelled) setRecipientsList([]); });
      } else {
        getUserAccount(userId)
          .then((acct) => {
            if (cancelled) return;
            const members = Array.isArray(acct?.team_members) ? acct.team_members : [];
            setRecipientsList(
              members.map((m) => ({
                id: m.userId || m.id,
                name: m.name || [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || m.id,
                email: m.email || '',
                phone: '',
              }))
            );
          })
          .catch(() => { if (!cancelled) setRecipientsList([]); });
      }
    }
    return () => { cancelled = true; };
  }, [userId, organization, recipientGroup]);

  useEffect(() => {
    let cancelled = false;
    getActiveProviderForChannel(MARKETING_CHANNELS.SMS, userId || undefined).then((res) => {
      if (cancelled) return;
      setActiveProvider(res);
      setProviderChecked(true);
      if (res?.adapter?.getProviderStatus) {
        res.adapter.getProviderStatus(res.provider).then((s) => {
          if (!cancelled) setProviderStatus(s?.status ?? null);
        });
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  const recipientOptions = useMemo(() => {
    return recipientsList.map((r) => ({ value: r.id, label: r.name || r.email || r.phone || r.id }));
  }, [recipientsList]);

  const recipientCount = getRecipientCount(recipientGroup, audienceMode, selectedIds, recipientOptions);
  const charCount = messageBody.length;
  const segmentEstimate = Math.max(1, Math.ceil(charCount / SMS_SEGMENT_LENGTH));
  const overSingleSegment = charCount > SMS_SEGMENT_LENGTH;
  const hasRecipients = recipientCount > 0;
  const hasBody = messageBody.trim().length > 0;
  const canSend = hasRecipients && hasBody && !!activeProvider && !saving;
  const canSaveDraft = (campaignName.trim() || hasBody) && !saving;
  const providerCapabilities = activeProvider ? getProviderCapabilities(activeProvider.provider) : { email: false, sms: false };

  const handleSaveDraft = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setCampaigns((prev) => [
        {
          id: `draft-${Date.now()}`,
          channel: 'sms',
          name: campaignName.trim() || 'Untitled SMS campaign',
          body: messageBody,
          recipientGroup,
          audienceMode,
          selectedRecipientIds: audienceMode === AUDIENCE_MODES.SELECTED ? selectedIds : undefined,
          status: 'draft',
          audienceSize: recipientCount,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setSaving(false);
    }, 400);
  }, [campaignName, messageBody, recipientGroup, audienceMode, selectedIds, recipientCount]);

  const handleSendNow = useCallback(async () => {
    if (!canSend) return;
    setSaving(true);
    const recipients = buildSmsRecipients(recipientsList, audienceMode, selectedIds);
    const result = await registrySendCampaign(MARKETING_CHANNELS.SMS, {
      body: messageBody,
      recipients,
    }, userId || undefined);
    setCampaigns((prev) => [
      {
        id: `sent-${Date.now()}`,
        channel: 'sms',
        name: campaignName.trim() || 'Untitled SMS campaign',
        body: messageBody,
        recipientGroup,
        audienceMode,
        selectedRecipientIds: audienceMode === AUDIENCE_MODES.SELECTED ? selectedIds : undefined,
        status: result.success ? 'sent' : 'failed',
        audienceSize: recipientCount,
        createdAt: new Date().toISOString(),
        sentAt: result.success ? new Date().toISOString() : undefined,
        errorMessage: result.error,
      },
      ...prev,
    ]);
    if (result.success) {
      setCampaignName('');
      setMessageBody('');
      setSelectedIds([]);
    }
    setSaving(false);
  }, [canSend, campaignName, messageBody, recipientsList, audienceMode, selectedIds, recipientCount, userId]);

  const handleSendTestSms = useCallback(async () => {
    if (!activeProvider || !messageBody.trim()) return;
    setTestSending(true);
    const result = await sendTestMessage(MARKETING_CHANNELS.SMS, {
      channel: MARKETING_CHANNELS.SMS,
      body: messageBody.trim(),
    }, userId || undefined);
    setTestSending(false);
    if (!result.success && result.error) {
      console.warn('Test SMS failed:', result.error);
    }
  }, [activeProvider, messageBody, userId]);

  return (
    <div className="space-y-8">
      {showPageHeader && (
        <PageHeader
          title="SMS Marketing"
          description="Compose and send text campaigns to clients or team members. Use the form below to create a new campaign, save a draft, or send now."
          actions={
            <PrimaryButton type="button" className="gap-2" disabled>
              <HiPlus className="w-5 h-5" />
              New SMS Campaign
            </PrimaryButton>
          }
        />
      )}

      {providerChecked && !activeProvider && (
        <ProviderWarningBanner
          title="No SMS provider configured"
          message="Configure an SMS provider (e.g. Twilio or Mailchimp) in Settings > API to send campaigns. Send Now will be disabled until a provider is set up."
          variant="warning"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative bg-white/90 dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-primary-600 dark:from-primary-500 dark:to-primary-700" aria-hidden />
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <span className="text-primary-600 dark:text-primary-400">Compose</span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Name, audience, and message.</p>

            <div className="space-y-5">
              <InputField
                id="sms-campaign-name"
                label="Campaign name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Holiday promo"
                variant="light"
              />
              <div>
                <label className={getLabelClasses('light')}>Sender</label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your business number (configured in settings)</p>
              </div>

              <RecipientSelector
                recipientGroup={recipientGroup}
                onRecipientGroupChange={(v) => { setRecipientGroup(v); setSelectedIds([]); }}
                audienceMode={audienceMode}
                onAudienceModeChange={(v) => { setAudienceMode(v); if (v === AUDIENCE_MODES.ALL) setSelectedIds([]); }}
                recipientOptions={recipientOptions}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                clientLabel={clientLabel}
                teamMemberLabel={teamMemberLabel}
              />

              <div>
                <TextareaInput
                  id="sms-body"
                  label="Message"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your SMS message..."
                  required
                  rows={4}
                  variant="light"
                />
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {charCount} characters
                    {overSingleSegment && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        · ~{segmentEstimate} segment(s)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="max-w-xs">
                <Dropdown
                  id="sms-insert-variable"
                  label="Insert variables (optional)"
                  value={variableSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      setMessageBody((prev) => prev + ` {{${v}}}`);
                      setVariableSelectValue('');
                    }
                  }}
                  options={VARIABLE_OPTIONS}
                  placeholder="Choose variable..."
                  searchable={false}
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview</p>
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900/80 rounded-xl p-5 border border-gray-200 dark:border-gray-600 min-h-[4rem] shadow-inner">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {messageBody || <span className="text-gray-400 dark:text-gray-500 italic">Message preview will appear here.</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <SecondaryButton onClick={handleSaveDraft} disabled={!canSaveDraft}>
                  Save Campaign
                </SecondaryButton>
                <SecondaryButton
                  onClick={handleSendTestSms}
                  disabled={!activeProvider || !messageBody.trim() || testSending}
                >
                  {testSending ? 'Sending…' : 'Send Test SMS'}
                </SecondaryButton>
                <PrimaryButton onClick={handleSendNow} disabled={!canSend}>
                  Send Now
                </PrimaryButton>
              </div>
            </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {activeProvider && (
            <ProviderInfoCard
              providerType={activeProvider.provider.providerType}
              status={providerStatus}
              capabilities={providerCapabilities}
              warning={activeProvider.provider.providerType === 'mailchimp' && providerCapabilities.sms
                ? 'Mailchimp SMS may require approval and supported market setup.'
                : undefined}
            />
          )}
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-none backdrop-blur-sm p-6 sticky top-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-primary-500" aria-hidden />
              Recipient summary
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Who will receive this campaign.</p>
            {!hasRecipients ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Select recipients to see summary.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Audience type</span>
                  <span className="font-medium text-gray-900 dark:text-white">{recipientGroup === RECIPIENT_GROUPS.CLIENTS ? clientLabel : teamMemberLabel}</span>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Total recipients</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{recipientCount}</span>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Est. delivery count</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{recipientCount}</span>
                </li>
                <li className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-gray-400">Est. cost</span>
                  <span className="text-gray-500 dark:text-gray-400">—</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="pt-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary-500" aria-hidden />
          Campaign history
        </h3>
        <CampaignHistoryTable
          campaigns={campaigns}
          channel="sms"
          emptyTitle="No SMS campaigns yet"
          emptyDescription="Create and send your first SMS campaign to see it here."
        />
      </section>
    </div>
  );
}
