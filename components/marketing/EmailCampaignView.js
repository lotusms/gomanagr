'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import RecipientSelector from './RecipientSelector';
import CampaignHistoryTable from './CampaignHistoryTable';
import ProviderWarningBanner from './ProviderWarningBanner';
import ProviderInfoCard from './ProviderInfoCard';
import { RECIPIENT_GROUPS, AUDIENCE_MODES } from '@/lib/marketingTypes';
import { getMockRecipientsByGroup, getMockCampaignsByChannel } from '@/lib/marketingMockData';
import { getActiveProviderForChannel, getProviderCapabilities, sendCampaign as registrySendCampaign, sendTestMessage } from '@/lib/marketing/providerRegistry';
import { MARKETING_CHANNELS } from '@/lib/marketing/types';
import { HiPlus } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import TextareaInput from '@/components/ui/TextareaInput';
import Dropdown from '@/components/ui/Dropdown';

const VARIABLE_OPTIONS = [
  { value: 'first_name', label: 'First name' },
  { value: 'company_name', label: 'Company name' },
];

function getRecipientCount(recipientGroup, audienceMode, selectedIds, options) {
  if (audienceMode === AUDIENCE_MODES.ALL) return options.length;
  return selectedIds.length;
}

function buildEmailRecipients(recipientGroup, audienceMode, selectedIds) {
  const list = getMockRecipientsByGroup(recipientGroup);
  const subset = audienceMode === AUDIENCE_MODES.SELECTED && selectedIds.length
    ? list.filter((r) => selectedIds.includes(r.id))
    : list;
  return subset.map((r) => ({ id: r.id, email: r.email, name: r.name }));
}

export default function EmailCampaignView({ showPageHeader = true, userId = null }) {
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [recipientGroup, setRecipientGroup] = useState(RECIPIENT_GROUPS.CLIENTS);
  const [audienceMode, setAudienceMode] = useState(AUDIENCE_MODES.ALL);
  const [selectedIds, setSelectedIds] = useState([]);
  const [body, setBody] = useState('');
  const [variableSelectValue, setVariableSelectValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [campaigns, setCampaigns] = useState(() => getMockCampaignsByChannel('email'));
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [providerChecked, setProviderChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveProviderForChannel(MARKETING_CHANNELS.EMAIL, userId || undefined).then((res) => {
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
    const list = getMockRecipientsByGroup(recipientGroup);
    return list.map((r) => ({ value: r.id, label: r.name || r.email || r.id }));
  }, [recipientGroup]);

  const recipientCount = getRecipientCount(recipientGroup, audienceMode, selectedIds, recipientOptions);
  const hasRecipients = recipientCount > 0;
  const hasSubject = subject.trim().length > 0;
  const hasBody = body.trim().length > 0;
  const canSend = hasRecipients && hasSubject && hasBody && !!activeProvider && !saving;
  const canSaveDraft = (campaignName.trim() || subject.trim() || body.trim()) && !saving;
  const providerCapabilities = activeProvider ? getProviderCapabilities(activeProvider.provider) : { email: false, sms: false };

  const handleSaveDraft = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setCampaigns((prev) => [
        {
          id: `draft-${Date.now()}`,
          channel: 'email',
          name: campaignName.trim() || 'Untitled email campaign',
          subject: subject.trim(),
          body,
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
  }, [campaignName, subject, body, recipientGroup, audienceMode, selectedIds, recipientCount]);

  const handleSendNow = useCallback(async () => {
    if (!canSend) return;
    setSaving(true);
    const recipients = buildEmailRecipients(recipientGroup, audienceMode, selectedIds);
    const result = await registrySendCampaign(MARKETING_CHANNELS.EMAIL, {
      subject: subject.trim(),
      body,
      recipients,
    }, userId || undefined);
    setCampaigns((prev) => [
      {
        id: `sent-${Date.now()}`,
        channel: 'email',
        name: campaignName.trim() || 'Untitled email campaign',
        subject: subject.trim(),
        body,
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
      setSubject('');
      setBody('');
      setSelectedIds([]);
    }
    setSaving(false);
  }, [canSend, campaignName, subject, body, recipientGroup, audienceMode, selectedIds, recipientCount, userId]);

  const handleSendTestEmail = useCallback(async () => {
    if (!activeProvider || !body.trim()) return;
    setTestSending(true);
    const result = await sendTestMessage(MARKETING_CHANNELS.EMAIL, {
      channel: MARKETING_CHANNELS.EMAIL,
      subject: subject.trim() || '(Test)',
      body: body.trim(),
    }, userId || undefined);
    setTestSending(false);
    if (!result.success && result.error) {
      console.warn('Test email failed:', result.error);
    }
  }, [activeProvider, subject, body, userId]);

  return (
    <div className="space-y-8">
      {showPageHeader && (
        <PageHeader
          title="Email Marketing"
          description="Compose and send email campaigns to clients or team members. Use the form below to create a new campaign, save a draft, or send now."
          actions={
            <PrimaryButton type="button" className="gap-2" disabled>
              <HiPlus className="w-5 h-5" />
              New Email Campaign
            </PrimaryButton>
          }
        />
      )}

      {providerChecked && !activeProvider && (
        <ProviderWarningBanner
          title="No email provider configured"
          message="Configure an email provider (e.g. Resend or Mailchimp) in Settings > API to send campaigns. Send Now will be disabled until a provider is set up."
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Name, subject, audience, and body.</p>

            <div className="space-y-5">
              <InputField
                id="email-campaign-name"
                label="Campaign name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Monthly newsletter"
                variant="light"
              />
              <InputField
                id="email-subject"
                label="Subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                required
                variant="light"
              />

              <RecipientSelector
                recipientGroup={recipientGroup}
                onRecipientGroupChange={(v) => { setRecipientGroup(v); setSelectedIds([]); }}
                audienceMode={audienceMode}
                onAudienceModeChange={(v) => { if (v === AUDIENCE_MODES.ALL) setSelectedIds([]); setAudienceMode(v); }}
                recipientOptions={recipientOptions}
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
              />

              <div>
                <TextareaInput
                  id="email-body"
                  label="Email body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email content..."
                  required
                  rows={8}
                  variant="light"
                />
              </div>

              <div className="max-w-xs">
                <Dropdown
                  id="email-insert-variable"
                  label="Insert variables (optional)"
                  value={variableSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      setBody((prev) => prev + ` {{${v}}}`);
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
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900/80 rounded-xl p-5 border border-gray-200 dark:border-gray-600 min-h-[6rem] shadow-inner">
                  <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-2">Subject: {subject || '—'}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {body || <span className="text-gray-400 dark:text-gray-500 italic">Email preview will appear here.</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <SecondaryButton onClick={handleSaveDraft} disabled={!canSaveDraft}>
                  Save Campaign
                </SecondaryButton>
                <SecondaryButton
                  onClick={handleSendTestEmail}
                  disabled={!activeProvider || !body.trim() || testSending}
                >
                  {testSending ? 'Sending…' : 'Send Test Email'}
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
              warning={activeProvider.provider.senderEmail ? undefined : 'Verify sender identity in provider settings.'}
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
                  <span className="text-gray-500 dark:text-gray-400">Recipient type</span>
                  <span className="font-medium text-gray-900 dark:text-white">{recipientGroup === RECIPIENT_GROUPS.CLIENTS ? 'Clients' : 'Team Members'}</span>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Audience size</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{recipientCount}</span>
                </li>
                <li className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-gray-400">Est. send count</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{recipientCount}</span>
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
          channel="email"
          emptyTitle="No email campaigns yet"
          emptyDescription="Create and send your first email campaign to see it here."
        />
      </section>
    </div>
  );
}
