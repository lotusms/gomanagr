'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import RecipientSelector from './RecipientSelector';
import ProviderWarningBanner from './ProviderWarningBanner';
import ProviderInfoCard from './ProviderInfoCard';
import { RECIPIENT_GROUPS, AUDIENCE_MODES, SMS_SEGMENT_LENGTH } from '@/lib/marketingTypes';
import {
  getActiveProviderForChannel,
  getProviderCapabilities,
  sendCampaign as registrySendCampaign,
  sendTestMessage,
} from '@/lib/marketing/providerRegistry';
import { MARKETING_CHANNELS } from '@/lib/marketing/types';
import InputField from '@/components/ui/InputField';
import TextareaInput from '@/components/ui/TextareaInput';
import Dropdown from '@/components/ui/Dropdown';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';
import { HiMail, HiChat, HiTemplate, HiCode, HiDocumentText } from 'react-icons/hi';
import { useToast } from '@/components/ui/Toast';

const VARIABLE_OPTIONS = [
  { value: 'first_name', label: 'First name' },
  { value: 'company_name', label: 'Company name' },
];

const TEMPLATE_TYPE_OPTIONS = [
  { value: '', label: 'Plain text', icon: HiDocumentText, description: 'Simple text body' },
  { value: 'mailchimp', label: 'Mailchimp template', icon: HiTemplate, description: 'Use a template from your Mailchimp account' },
  { value: 'custom_html', label: 'Custom HTML', icon: HiCode, description: 'Write or paste your own HTML' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', icon: HiMail },
  { value: 'sms', label: 'SMS', icon: HiChat },
];

function getRecipientCount(audienceMode, selectedIds, options) {
  if (audienceMode === AUDIENCE_MODES.ALL) return options.length;
  return selectedIds.length;
}

function buildRecipients(recipientsList, audienceMode, selectedIds, channel) {
  const subset =
    audienceMode === AUDIENCE_MODES.SELECTED && selectedIds.length
      ? recipientsList.filter((r) => selectedIds.includes(r.id))
      : recipientsList;
  if (channel === 'sms') {
    return subset.map((r) => ({ id: r.id, phone: r.phone || r.email, name: r.name }));
  }
  return subset.map((r) => ({ id: r.id, email: r.email, name: r.name }));
}

/**
 * Shared campaign compose form for both email and SMS.
 *
 * @param {{
 *   campaign?: object,
 *   userId: string,
 *   organizationId?: string,
 *   defaultChannel?: 'email' | 'sms',
 *   onSuccess: (campaign: object) => void,
 *   onCancel: () => void,
 * }} props
 */
export default function CampaignForm({
  campaign = null,
  userId,
  organizationId = null,
  defaultChannel = 'email',
  onSuccess,
  onCancel,
}) {
  const { account } = useUserAccount();
  const toast = useToast();
  const isEdit = !!campaign;

  const [channel, setChannel] = useState(campaign?.channel || defaultChannel);
  const [campaignName, setCampaignName] = useState(campaign?.name || '');
  const [subject, setSubject] = useState(campaign?.subject || '');
  const [body, setBody] = useState(campaign?.body || '');
  const [recipientGroup, setRecipientGroup] = useState(campaign?.recipient_group || campaign?.recipientGroup || RECIPIENT_GROUPS.CLIENTS);
  const [audienceMode, setAudienceMode] = useState(campaign?.audience_mode || campaign?.audienceMode || AUDIENCE_MODES.ALL);
  const [selectedIds, setSelectedIds] = useState(campaign?.selected_recipient_ids || campaign?.selectedRecipientIds || []);
  const [variableSelectValue, setVariableSelectValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [providerChecked, setProviderChecked] = useState(false);
  const [organization, setOrganization] = useState(undefined);
  const [recipientsList, setRecipientsList] = useState([]);

  const [templateType, setTemplateType] = useState(campaign?.template_type || campaign?.templateType || '');
  const [mailchimpTemplateId, setMailchimpTemplateId] = useState(campaign?.mailchimp_template_id || campaign?.mailchimpTemplateId || null);
  const [mailchimpTemplateName, setMailchimpTemplateName] = useState(campaign?.mailchimp_template_name || campaign?.mailchimpTemplateName || '');
  const [customHtml, setCustomHtml] = useState(campaign?.custom_html || campaign?.customHtml || '');
  const [mcTemplates, setMcTemplates] = useState([]);
  const [mcTemplatesLoading, setMcTemplatesLoading] = useState(false);
  const [mcTemplatesError, setMcTemplatesError] = useState(null);
  const [mcServerPrefix, setMcServerPrefix] = useState(null);

  const industry = organization?.industry ?? account?.industry ?? null;
  const clientLabel = getTermForIndustry(industry, 'client');
  const teamMemberLabel = getTermForIndustry(industry, 'teamMember');
  const isEmail = channel === 'email';

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
    const ch = isEmail ? MARKETING_CHANNELS.EMAIL : MARKETING_CHANNELS.SMS;
    getActiveProviderForChannel(ch, userId || undefined).then((res) => {
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
  }, [userId, isEmail]);

  const isMailchimpProvider = activeProvider?.provider?.providerType === 'mailchimp';

  useEffect(() => {
    if (!isEmail || !organizationId || !isMailchimpProvider) {
      setMcTemplates([]);
      return;
    }
    let cancelled = false;
    setMcTemplatesLoading(true);
    setMcTemplatesError(null);
    fetch('/api/get-mailchimp-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setMcTemplatesError(data.error);
        setMcTemplates(data.templates || []);
        if (data.serverPrefix) setMcServerPrefix(data.serverPrefix);
        setMcTemplatesLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setMcTemplatesError(err.message);
          setMcTemplatesLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [isEmail, organizationId, isMailchimpProvider]);

  const recipientOptions = useMemo(() => {
    return recipientsList.map((r) => ({ value: r.id, label: r.name || r.email || r.phone || r.id }));
  }, [recipientsList]);

  const recipientCount = getRecipientCount(audienceMode, selectedIds, recipientOptions);
  const charCount = body.length;
  const segmentEstimate = Math.max(1, Math.ceil(charCount / SMS_SEGMENT_LENGTH));
  const overSingleSegment = !isEmail && charCount > SMS_SEGMENT_LENGTH;
  const hasRecipients = recipientCount > 0;
  const hasSubject = isEmail ? subject.trim().length > 0 : true;
  const hasContent = templateType === 'mailchimp'
    ? !!mailchimpTemplateId
    : templateType === 'custom_html'
      ? customHtml.trim().length > 0
      : body.trim().length > 0;
  const canSend = hasRecipients && hasSubject && hasContent && !!activeProvider && !saving;
  const canSaveDraft = (campaignName.trim() || (isEmail && subject.trim()) || body.trim() || customHtml.trim() || mailchimpTemplateId) && !saving;
  const providerCapabilities = activeProvider ? getProviderCapabilities(activeProvider.provider) : { email: false, sms: false };

  const buildCampaignPayload = useCallback((status, extraFields = {}) => ({
    ...(campaign?.id ? { id: campaign.id } : {}),
    channel,
    name: campaignName.trim() || (isEmail ? 'Untitled email campaign' : 'Untitled SMS campaign'),
    subject: isEmail ? subject.trim() : '',
    body,
    recipientGroup,
    audienceMode,
    selectedRecipientIds: audienceMode === AUDIENCE_MODES.SELECTED ? selectedIds : [],
    status,
    audienceSize: recipientCount,
    templateType: isEmail ? (templateType || null) : null,
    mailchimpTemplateId: templateType === 'mailchimp' ? mailchimpTemplateId : null,
    mailchimpTemplateName: templateType === 'mailchimp' ? mailchimpTemplateName : null,
    customHtml: templateType === 'custom_html' ? customHtml : null,
    ...extraFields,
  }), [campaign?.id, channel, campaignName, isEmail, subject, body, recipientGroup, audienceMode, selectedIds, recipientCount, templateType, mailchimpTemplateId, mailchimpTemplateName, customHtml]);

  const saveCampaignToApi = useCallback(async (campaignData) => {
    const res = await fetch('/api/save-marketing-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, organizationId, campaign: campaignData }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to save');
    return json.campaign;
  }, [userId, organizationId]);

  const handleSaveDraft = useCallback(async () => {
    if (!canSaveDraft) return;
    setSaving(true);
    try {
      const payload = buildCampaignPayload('draft');
      const saved = await saveCampaignToApi(payload);
      toast.success(isEdit ? 'Campaign updated.' : 'Campaign draft saved.');
      onSuccess?.(saved);
    } catch (err) {
      console.error('Save draft failed:', err);
      toast.error('Failed to save campaign. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [canSaveDraft, buildCampaignPayload, saveCampaignToApi, onSuccess, toast, isEdit]);

  const handleSendNow = useCallback(async () => {
    if (!canSend) return;
    setSaving(true);
    setSendError(null);
    try {
      const recipients = buildRecipients(recipientsList, audienceMode, selectedIds, channel);

      const queuedPayload = buildCampaignPayload('queued');
      const savedCampaign = await saveCampaignToApi(queuedPayload);

      if (isEmail && isMailchimpProvider && organizationId) {
        const serverCampaign = {
          ...savedCampaign,
          template_type: templateType || null,
          mailchimp_template_id: templateType === 'mailchimp' ? mailchimpTemplateId : null,
          custom_html: templateType === 'custom_html' ? customHtml : null,
        };
        const res = await fetch('/api/send-marketing-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, organizationId, campaign: serverCampaign, recipients }),
        });
        const result = await res.json();
        if (!result.success) {
          const errorMsg = result.error || 'Send failed';
          setSendError(errorMsg);
          toast.error('Campaign send failed.');
          await saveCampaignToApi({
            ...queuedPayload,
            id: savedCampaign.id,
            status: 'failed',
            errorMessage: errorMsg,
          });
        } else {
          toast.success('Campaign sent successfully!');
          onSuccess?.(savedCampaign);
        }
        return;
      }

      const sendPayload = { body, recipients };
      if (isEmail) sendPayload.subject = subject.trim();
      const ch = isEmail ? MARKETING_CHANNELS.EMAIL : MARKETING_CHANNELS.SMS;
      const result = await registrySendCampaign(ch, sendPayload, userId || undefined);

      if (!result.success) {
        setSendError(result.error || 'Send failed');
        toast.error('Campaign send failed.');
      }

      await saveCampaignToApi({
        ...queuedPayload,
        id: savedCampaign.id,
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date().toISOString() : null,
        errorMessage: result.error || null,
      });
      if (result.success) {
        toast.success('Campaign sent successfully!');
        onSuccess?.(savedCampaign);
      }
    } catch (err) {
      console.error('Send failed:', err);
      setSendError(err.message || 'An unexpected error occurred while sending.');
      toast.error('An unexpected error occurred while sending.');
    } finally {
      setSaving(false);
    }
  }, [canSend, recipientsList, audienceMode, selectedIds, channel, body, isEmail, subject, userId, organizationId, isMailchimpProvider, templateType, mailchimpTemplateId, customHtml, buildCampaignPayload, saveCampaignToApi, onSuccess, toast]);

  const handleSendTest = useCallback(async () => {
    if (!activeProvider || !body.trim()) return;
    setTestSending(true);
    const ch = isEmail ? MARKETING_CHANNELS.EMAIL : MARKETING_CHANNELS.SMS;
    const payload = { channel: ch, body: body.trim() };
    if (isEmail) payload.subject = subject.trim() || '(Test)';
    const result = await sendTestMessage(ch, payload, userId || undefined);
    setTestSending(false);
    if (!result.success && result.error) {
      console.warn('Test message failed:', result.error);
    }
  }, [activeProvider, body, isEmail, subject, userId]);

  const channelLabel = isEmail ? 'Email' : 'SMS';

  return (
    <div className="space-y-6">
      {providerChecked && !activeProvider && (
        <ProviderWarningBanner
          title={`No ${channelLabel.toLowerCase()} provider configured`}
          message={`Configure ${isEmail ? 'an email provider (e.g. Resend or Mailchimp)' : 'an SMS provider (e.g. Twilio or Mailchimp)'} in Settings > Integrations. Send Now will be disabled until a provider is set up.`}
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {isEmail ? 'Name, subject, audience, and body.' : 'Name, audience, and message.'}
              </p>

              <div className="space-y-5">
                {/* Channel selector (new campaigns only) */}
                {!isEdit && (
                  <div>
                    <label className={getLabelClasses('light')}>Channel</label>
                    <div className="flex gap-2 mt-1">
                      {CHANNEL_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setChannel(value)}
                          className={`
                            inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                            ${channel === value
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isEdit && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {isEmail ? <HiMail className="w-4 h-4" /> : <HiChat className="w-4 h-4" />}
                    <span className="font-medium">{channelLabel} Campaign</span>
                  </div>
                )}

                <InputField
                  id="campaign-name"
                  label="Campaign name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={isEmail ? 'e.g. Monthly newsletter' : 'e.g. Holiday promo'}
                  variant="light"
                />

                {isEmail && (
                  <InputField
                    id="campaign-subject"
                    label="Subject line"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                    required
                    variant="light"
                  />
                )}

                {/* Template type selector (email only) */}
                {isEmail && (
                  <div>
                    <label className={getLabelClasses('light')}>Email content type</label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {TEMPLATE_TYPE_OPTIONS.map(({ value, label, icon: Icon, description }) => {
                        const isActive = templateType === value;
                        const isMcOption = value === 'mailchimp';
                        const disabled = isMcOption && !isMailchimpProvider;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={disabled}
                            onClick={() => setTemplateType(value)}
                            title={disabled ? 'Connect Mailchimp in Settings > Integrations' : description}
                            className={`
                              inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200
                              ${isActive
                                ? 'bg-primary-600 text-white shadow-md'
                                : disabled
                                  ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }
                            `}
                          >
                            <Icon className="w-4 h-4" aria-hidden />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {templateType === 'mailchimp' && !isMailchimpProvider && (
                      <p className="mt-1.5 text-sm text-amber-600 dark:text-amber-400">
                        Connect Mailchimp in Settings &gt; Integrations to use templates.
                      </p>
                    )}
                  </div>
                )}

                {/* Mailchimp template picker */}
                {isEmail && templateType === 'mailchimp' && isMailchimpProvider && (
                  <div>
                    {mcTemplatesLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    ) : mcTemplatesError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">{mcTemplatesError}</p>
                    ) : mcTemplates.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No templates found in your Mailchimp account.{' '}
                          <a
                            href={`https://${mcServerPrefix || 'us21'}.admin.mailchimp.com/templates/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 dark:text-primary-400 underline hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            Create templates in Mailchimp
                          </a>{' '}
                          first, then they will appear here.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Dropdown
                          id="mc-template-select"
                          label="Select Mailchimp template"
                          value={mailchimpTemplateId ? String(mailchimpTemplateId) : ''}
                          onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            setMailchimpTemplateId(id);
                            const tpl = mcTemplates.find((t) => t.id === id);
                            setMailchimpTemplateName(tpl?.name || '');
                          }}
                          options={mcTemplates.map((t) => ({
                            value: String(t.id),
                            label: t.name,
                          }))}
                          placeholder="Choose a template..."
                          searchable={mcTemplates.length > 6}
                        />
                        {mailchimpTemplateId && (() => {
                          const tpl = mcTemplates.find((t) => t.id === mailchimpTemplateId);
                          if (!tpl) return null;
                          return (
                            <div className="mt-3 flex items-start gap-4 rounded-xl border border-primary-200 dark:border-primary-700/50 bg-primary-50/50 dark:bg-primary-900/10 p-4">
                              {tpl.thumbnail && (
                                <img
                                  src={tpl.thumbnail}
                                  alt={`Preview of ${tpl.name}`}
                                  className="w-24 h-auto rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">{tpl.name}</p>
                                {tpl.date_created && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Created: {new Date(tpl.date_created).toLocaleDateString()}
                                  </p>
                                )}
                                <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                                  This template will be used when the campaign is sent via Mailchimp.
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {!isEmail && (
                  <div>
                    <label className={getLabelClasses('light')}>Sender</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Your business number (configured in settings)
                    </p>
                  </div>
                )}

                <RecipientSelector
                  recipientGroup={recipientGroup}
                  onRecipientGroupChange={(v) => { setRecipientGroup(v); setSelectedIds([]); }}
                  audienceMode={audienceMode}
                  onAudienceModeChange={(v) => { if (v === AUDIENCE_MODES.ALL) setSelectedIds([]); setAudienceMode(v); }}
                  recipientOptions={recipientOptions}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
                  clientLabel={clientLabel}
                  teamMemberLabel={teamMemberLabel}
                />

                {/* Custom HTML editor */}
                {isEmail && templateType === 'custom_html' && (
                  <div>
                    <label className={getLabelClasses('light')} htmlFor="campaign-custom-html">
                      HTML content
                    </label>
                    <textarea
                      id="campaign-custom-html"
                      value={customHtml}
                      onChange={(e) => setCustomHtml(e.target.value)}
                      placeholder="<html><body>Your email HTML here...</body></html>"
                      rows={12}
                      className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Paste your HTML email template. This will be sent as-is through Mailchimp or your email provider.
                    </p>
                  </div>
                )}

                {/* Plain text body */}
                {templateType !== 'custom_html' && (
                  <div>
                    <TextareaInput
                      id="campaign-body"
                      label={
                        templateType === 'mailchimp'
                          ? 'Email body (used if template content is unavailable via API)'
                          : isEmail ? 'Email body' : 'Message'
                      }
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={
                        templateType === 'mailchimp'
                          ? 'Enter fallback email text in case the template cannot be loaded...'
                          : isEmail ? 'Write your email content...' : 'Type your SMS message...'
                      }
                      required={templateType !== 'mailchimp'}
                      rows={templateType === 'mailchimp' ? 4 : isEmail ? 8 : 4}
                      variant="light"
                    />
                    {templateType === 'mailchimp' && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Some Mailchimp templates (new email builder) cannot be loaded via the API.
                        Enter body text here as a fallback so your campaign can still be sent.
                      </p>
                    )}
                    {!isEmail && templateType !== 'mailchimp' && (
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
                    )}
                  </div>
                )}

                {/* Variable insertion (plain text and custom HTML) */}
                {templateType !== 'mailchimp' && (
                  <div className="max-w-xs">
                    <Dropdown
                      id="campaign-insert-variable"
                      label="Insert variables (optional)"
                      value={variableSelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) {
                          if (templateType === 'custom_html') {
                            setCustomHtml((prev) => prev + ` {{${v}}}`);
                          } else {
                            setBody((prev) => prev + ` {{${v}}}`);
                          }
                          setVariableSelectValue('');
                        }
                      }}
                      options={VARIABLE_OPTIONS}
                      placeholder="Choose variable..."
                      searchable={false}
                    />
                  </div>
                )}

                {/* Preview */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview</p>
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900/80 rounded-xl p-5 border border-gray-200 dark:border-gray-600 min-h-[4rem] shadow-inner">
                    {isEmail && (
                      <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-2">
                        Subject: {subject || '—'}
                      </p>
                    )}
                    {templateType === 'mailchimp' && mailchimpTemplateName ? (
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <HiTemplate className="w-4 h-4 text-primary-500" />
                        <span>Using Mailchimp template: <strong>{mailchimpTemplateName}</strong></span>
                      </div>
                    ) : templateType === 'custom_html' && customHtml.trim() ? (
                      <iframe
                        title="HTML preview"
                        srcDoc={customHtml}
                        className="w-full min-h-[8rem] rounded border border-gray-200 dark:border-gray-600 bg-white"
                        sandbox=""
                      />
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {body || (
                          <span className="text-gray-400 dark:text-gray-500 italic">
                            {isEmail ? 'Email preview will appear here.' : 'Message preview will appear here.'}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {sendError && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Campaign send failed</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{sendError}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <SecondaryButton type="button" onClick={onCancel}>
                    Cancel
                  </SecondaryButton>
                  <SecondaryButton onClick={handleSaveDraft} disabled={!canSaveDraft}>
                    {saving ? 'Saving…' : 'Save Draft'}
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={handleSendTest}
                    disabled={!activeProvider || !body.trim() || testSending}
                  >
                    {testSending ? 'Sending…' : `Send Test ${channelLabel}`}
                  </SecondaryButton>
                  <PrimaryButton onClick={handleSendNow} disabled={!canSend}>
                    {saving ? 'Sending…' : 'Send Now'}
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
              warning={
                isEmail
                  ? (activeProvider.provider.senderEmail ? undefined : 'Verify sender identity in provider settings.')
                  : (activeProvider.provider.providerType === 'mailchimp' && providerCapabilities.sms
                    ? 'Mailchimp SMS may require approval and supported market setup.'
                    : undefined)
              }
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
                  <span className="font-medium text-gray-900 dark:text-white">
                    {recipientGroup === RECIPIENT_GROUPS.CLIENTS ? clientLabel : teamMemberLabel}
                  </span>
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
    </div>
  );
}
