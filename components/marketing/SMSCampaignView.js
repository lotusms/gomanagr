'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import RecipientSelector from './RecipientSelector';
import CampaignHistoryTable from './CampaignHistoryTable';
import ProviderWarningBanner from './ProviderWarningBanner';
import ProviderInfoCard from './ProviderInfoCard';
import { RECIPIENT_GROUPS, AUDIENCE_MODES, SMS_SEGMENT_LENGTH } from '@/lib/marketingTypes';
import { getMockRecipientsByGroup, getMockCampaignsByChannel } from '@/lib/marketingMockData';
import { getActiveProviderForChannel, getProviderCapabilities, sendCampaign as registrySendCampaign, sendTestMessage } from '@/lib/marketing/providerRegistry';
import { MARKETING_CHANNELS } from '@/lib/marketing/types';
import { HiPlus } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import TextareaInput from '@/components/ui/TextareaInput';
import Dropdown from '@/components/ui/Dropdown';
import { getLabelClasses } from '@/components/ui/formControlStyles';

const VARIABLE_OPTIONS = [
  { value: 'first_name', label: 'First name' },
  { value: 'company_name', label: 'Company name' },
];

function getRecipientCount(recipientGroup, audienceMode, selectedIds, options) {
  if (audienceMode === AUDIENCE_MODES.ALL) return options.length;
  return selectedIds.length;
}

/** Build campaign recipients for sending (id, phone, name). */
function buildSmsRecipients(recipientGroup, audienceMode, selectedIds) {
  const list = getMockRecipientsByGroup(recipientGroup);
  const subset = audienceMode === AUDIENCE_MODES.SELECTED && selectedIds.length
    ? list.filter((r) => selectedIds.includes(r.id))
    : list;
  return subset.map((r) => ({ id: r.id, phone: r.phone || r.email, name: r.name }));
}

export default function SMSCampaignView({ showPageHeader = true }) {
  const [campaignName, setCampaignName] = useState('');
  const [recipientGroup, setRecipientGroup] = useState(RECIPIENT_GROUPS.CLIENTS);
  const [audienceMode, setAudienceMode] = useState(AUDIENCE_MODES.ALL);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [variableSelectValue, setVariableSelectValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [campaigns, setCampaigns] = useState(() => getMockCampaignsByChannel('sms'));
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getActiveProviderForChannel(MARKETING_CHANNELS.SMS).then((res) => {
      if (cancelled) return;
      setActiveProvider(res);
      if (res?.adapter?.getProviderStatus) {
        res.adapter.getProviderStatus(res.provider).then((s) => {
          if (!cancelled) setProviderStatus(s?.status ?? null);
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  const recipientOptions = useMemo(() => {
    const list = getMockRecipientsByGroup(recipientGroup);
    return list.map((r) => ({ value: r.id, label: r.name || r.email || r.phone || r.id }));
  }, [recipientGroup]);

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
    const recipients = buildSmsRecipients(recipientGroup, audienceMode, selectedIds);
    const result = await registrySendCampaign(MARKETING_CHANNELS.SMS, {
      body: messageBody,
      recipients,
    });
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
  }, [canSend, campaignName, messageBody, recipientGroup, audienceMode, selectedIds, recipientCount]);

  const handleSendTestSms = useCallback(async () => {
    if (!activeProvider || !messageBody.trim()) return;
    setTestSending(true);
    const result = await sendTestMessage(MARKETING_CHANNELS.SMS, {
      channel: MARKETING_CHANNELS.SMS,
      body: messageBody.trim(),
    });
    setTestSending(false);
    if (!result.success && result.error) {
      console.warn('Test SMS failed:', result.error);
    }
  }, [activeProvider, messageBody]);

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

      {!activeProvider && (
        <ProviderWarningBanner
          title="No SMS provider configured"
          message="Configure an SMS provider (e.g. Twilio or Mailchimp) in Settings > API to send campaigns. Send Now will be disabled until a provider is set up."
          variant="warning"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compose</h3>

            <div className="space-y-4">
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

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</p>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 min-h-[4rem]">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {messageBody || <span className="text-gray-400 dark:text-gray-500">Message preview will appear here.</span>}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recipient summary</h3>
            {!hasRecipients ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Select recipients to see summary.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Audience type</span>
                  <span className="text-gray-900 dark:text-white">{recipientGroup === RECIPIENT_GROUPS.CLIENTS ? 'Clients' : 'Team Members'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total recipients</span>
                  <span className="text-gray-900 dark:text-white">{recipientCount}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Est. delivery count</span>
                  <span className="text-gray-900 dark:text-white">{recipientCount}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Est. cost</span>
                  <span className="text-gray-500 dark:text-gray-400">—</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign history</h3>
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
