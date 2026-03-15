/**
 * Unit tests for lib/marketing/types.js (constants and exports for line coverage).
 */
import {
  MARKETING_CHANNELS,
  PROVIDER_TYPES,
  RECIPIENT_GROUPS,
  AUDIENCE_MODES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUSES_LEGACY,
  SMS_SEGMENT_LENGTH,
} from '@/lib/marketing/types.js';

describe('lib/marketing/types', () => {
  it('exports MARKETING_CHANNELS with SMS and EMAIL', () => {
    expect(MARKETING_CHANNELS.SMS).toBe('sms');
    expect(MARKETING_CHANNELS.EMAIL).toBe('email');
  });

  it('exports PROVIDER_TYPES with MAILCHIMP, TWILIO, SES, RESEND', () => {
    expect(PROVIDER_TYPES.MAILCHIMP).toBe('mailchimp');
    expect(PROVIDER_TYPES.TWILIO).toBe('twilio');
    expect(PROVIDER_TYPES.SES).toBe('ses');
    expect(PROVIDER_TYPES.RESEND).toBe('resend');
  });

  it('exports RECIPIENT_GROUPS with CLIENTS and TEAM', () => {
    expect(RECIPIENT_GROUPS.CLIENTS).toBe('clients');
    expect(RECIPIENT_GROUPS.TEAM).toBe('team');
  });

  it('exports AUDIENCE_MODES with ALL and SELECTED', () => {
    expect(AUDIENCE_MODES.ALL).toBe('all');
    expect(AUDIENCE_MODES.SELECTED).toBe('selected');
  });

  it('exports CAMPAIGN_STATUSES with DRAFT, QUEUED, SENT, FAILED', () => {
    expect(CAMPAIGN_STATUSES.DRAFT).toBe('draft');
    expect(CAMPAIGN_STATUSES.QUEUED).toBe('queued');
    expect(CAMPAIGN_STATUSES.SENT).toBe('sent');
    expect(CAMPAIGN_STATUSES.FAILED).toBe('failed');
  });

  it('exports CAMPAIGN_STATUSES_LEGACY', () => {
    expect(CAMPAIGN_STATUSES_LEGACY.DRAFT).toBe('draft');
    expect(CAMPAIGN_STATUSES_LEGACY.SENT).toBe('sent');
    expect(CAMPAIGN_STATUSES_LEGACY.FAILED).toBe('failed');
  });

  it('exports SMS_SEGMENT_LENGTH as number', () => {
    expect(SMS_SEGMENT_LENGTH).toBe(160);
  });
});
