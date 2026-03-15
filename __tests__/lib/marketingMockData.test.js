/**
 * Unit tests for marketingMockData: MOCK_CLIENTS, MOCK_TEAM_MEMBERS, MOCK_SMS_CAMPAIGNS,
 * MOCK_EMAIL_CAMPAIGNS, getMockRecipientsByGroup, getMockCampaignsByChannel.
 */
import {
  MOCK_CLIENTS,
  MOCK_TEAM_MEMBERS,
  MOCK_SMS_CAMPAIGNS,
  MOCK_EMAIL_CAMPAIGNS,
  getMockRecipientsByGroup,
  getMockCampaignsByChannel,
} from '@/lib/marketingMockData';

describe('marketingMockData', () => {
  describe('MOCK_CLIENTS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(MOCK_CLIENTS)).toBe(true);
      expect(MOCK_CLIENTS.length).toBeGreaterThan(0);
    });

    it('each item has id, name, type "client", and optional email/phone', () => {
      MOCK_CLIENTS.forEach((c) => {
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('name');
        expect(c.type).toBe('client');
        expect(typeof c.id).toBe('string');
        expect(typeof c.name).toBe('string');
        if (c.email != null) expect(typeof c.email).toBe('string');
        if (c.phone != null) expect(typeof c.phone).toBe('string');
      });
    });
  });

  describe('MOCK_TEAM_MEMBERS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(MOCK_TEAM_MEMBERS)).toBe(true);
      expect(MOCK_TEAM_MEMBERS.length).toBeGreaterThan(0);
    });

    it('each item has id, name, type "team"', () => {
      MOCK_TEAM_MEMBERS.forEach((t) => {
        expect(t).toHaveProperty('id');
        expect(t).toHaveProperty('name');
        expect(t.type).toBe('team');
      });
    });
  });

  describe('MOCK_SMS_CAMPAIGNS', () => {
    it('is a non-empty array with channel "sms"', () => {
      expect(Array.isArray(MOCK_SMS_CAMPAIGNS)).toBe(true);
      expect(MOCK_SMS_CAMPAIGNS.length).toBeGreaterThan(0);
      MOCK_SMS_CAMPAIGNS.forEach((c) => expect(c.channel).toBe('sms'));
    });

    it('each item has id, name, body, recipientGroup, audienceMode, status', () => {
      MOCK_SMS_CAMPAIGNS.forEach((c) => {
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('body');
        expect(c).toHaveProperty('recipientGroup');
        expect(c).toHaveProperty('audienceMode');
        expect(c).toHaveProperty('status');
      });
    });
  });

  describe('MOCK_EMAIL_CAMPAIGNS', () => {
    it('is a non-empty array with channel "email"', () => {
      expect(Array.isArray(MOCK_EMAIL_CAMPAIGNS)).toBe(true);
      expect(MOCK_EMAIL_CAMPAIGNS.length).toBeGreaterThan(0);
      MOCK_EMAIL_CAMPAIGNS.forEach((c) => expect(c.channel).toBe('email'));
    });

    it('each item has id, name, body, subject optional, recipientGroup, status', () => {
      MOCK_EMAIL_CAMPAIGNS.forEach((c) => {
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('body');
        expect(c).toHaveProperty('recipientGroup');
        expect(c).toHaveProperty('status');
      });
    });
  });

  describe('getMockRecipientsByGroup', () => {
    it('returns copy of MOCK_TEAM_MEMBERS when recipientGroup is "team"', () => {
      const result = getMockRecipientsByGroup('team');
      expect(result).toEqual(MOCK_TEAM_MEMBERS);
      expect(result).not.toBe(MOCK_TEAM_MEMBERS);
    });

    it('returns copy of MOCK_CLIENTS when recipientGroup is "clients"', () => {
      const result = getMockRecipientsByGroup('clients');
      expect(result).toEqual(MOCK_CLIENTS);
      expect(result).not.toBe(MOCK_CLIENTS);
    });

    it('returns clients for any other recipientGroup', () => {
      const result = getMockRecipientsByGroup('other');
      expect(result).toEqual(MOCK_CLIENTS);
    });
  });

  describe('getMockCampaignsByChannel', () => {
    it('returns copy of MOCK_SMS_CAMPAIGNS when channel is "sms"', () => {
      const result = getMockCampaignsByChannel('sms');
      expect(result).toEqual(MOCK_SMS_CAMPAIGNS);
      expect(result).not.toBe(MOCK_SMS_CAMPAIGNS);
    });

    it('returns copy of MOCK_EMAIL_CAMPAIGNS when channel is "email"', () => {
      const result = getMockCampaignsByChannel('email');
      expect(result).toEqual(MOCK_EMAIL_CAMPAIGNS);
      expect(result).not.toBe(MOCK_EMAIL_CAMPAIGNS);
    });

    it('returns email campaigns for any other channel', () => {
      const result = getMockCampaignsByChannel('other');
      expect(result).toEqual(MOCK_EMAIL_CAMPAIGNS);
    });
  });
});
