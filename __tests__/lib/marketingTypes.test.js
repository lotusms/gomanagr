/**
 * Unit tests for marketingTypes: re-exports from lib/marketing/types are present and have expected values.
 */
import {
  MARKETING_CHANNELS,
  RECIPIENT_GROUPS,
  AUDIENCE_MODES,
  SMS_SEGMENT_LENGTH,
  PROVIDER_TYPES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUSES_LEGACY,
} from '@/lib/marketingTypes';

describe('marketingTypes', () => {
  it('exports MARKETING_CHANNELS with SMS and EMAIL', () => {
    expect(MARKETING_CHANNELS).toBeDefined();
    expect(MARKETING_CHANNELS.SMS).toBe('sms');
    expect(MARKETING_CHANNELS.EMAIL).toBe('email');
  });

  it('exports RECIPIENT_GROUPS with CLIENTS and TEAM', () => {
    expect(RECIPIENT_GROUPS).toBeDefined();
    expect(RECIPIENT_GROUPS.CLIENTS).toBe('clients');
    expect(RECIPIENT_GROUPS.TEAM).toBe('team');
  });

  it('exports AUDIENCE_MODES with ALL and SELECTED', () => {
    expect(AUDIENCE_MODES).toBeDefined();
    expect(AUDIENCE_MODES.ALL).toBe('all');
    expect(AUDIENCE_MODES.SELECTED).toBe('selected');
  });

  it('exports SMS_SEGMENT_LENGTH as a number', () => {
    expect(typeof SMS_SEGMENT_LENGTH).toBe('number');
    expect(SMS_SEGMENT_LENGTH).toBeGreaterThan(0);
  });

  it('exports PROVIDER_TYPES with MAILCHIMP, TWILIO, SES, RESEND', () => {
    expect(PROVIDER_TYPES).toBeDefined();
    expect(PROVIDER_TYPES.MAILCHIMP).toBe('mailchimp');
    expect(PROVIDER_TYPES.TWILIO).toBe('twilio');
    expect(PROVIDER_TYPES.SES).toBe('ses');
    expect(PROVIDER_TYPES.RESEND).toBe('resend');
  });

  it('exports CAMPAIGN_STATUSES', () => {
    expect(CAMPAIGN_STATUSES).toBeDefined();
    expect(CAMPAIGN_STATUSES.DRAFT).toBe('draft');
    expect(CAMPAIGN_STATUSES.QUEUED).toBe('queued');
    expect(CAMPAIGN_STATUSES.SENT).toBe('sent');
    expect(CAMPAIGN_STATUSES.FAILED).toBe('failed');
  });

  it('exports CAMPAIGN_STATUSES_LEGACY', () => {
    expect(CAMPAIGN_STATUSES_LEGACY).toBeDefined();
    expect(CAMPAIGN_STATUSES_LEGACY.DRAFT).toBe('draft');
    expect(CAMPAIGN_STATUSES_LEGACY.SENT).toBe('sent');
    expect(CAMPAIGN_STATUSES_LEGACY.FAILED).toBe('failed');
  });
});
