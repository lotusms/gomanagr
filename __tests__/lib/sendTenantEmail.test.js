/**
 * Unit tests for lib/sendTenantEmail.js
 */
const mockGetMarketingConfig = jest.fn();
jest.mock('@/lib/getMarketingConfig', () => ({
  getMarketingConfig: (...args) => mockGetMarketingConfig(...args),
}));

const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (payload) => mockResendSend(payload) },
  })),
}));

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: (...args) => mockCreateTransport(...args),
  },
}));

import { sendTenantEmail } from '@/lib/sendTenantEmail';

describe('sendTenantEmail', () => {
  let consoleErrorSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetMarketingConfig.mockResolvedValue({
      providers: [],
      defaultEmailProvider: null,
    });
    mockResendSend.mockResolvedValue({ error: null });
    mockSendMail.mockResolvedValue({});
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('returns sent: false when to is missing', async () => {
    const result = await sendTenantEmail('org-1', { subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'Missing recipient' });
    expect(mockGetMarketingConfig).not.toHaveBeenCalled();
  });

  it('returns sent: false when to is empty string', async () => {
    const result = await sendTenantEmail('org-1', { to: '', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'Missing recipient' });
  });

  it('returns sent: false when to is whitespace only', async () => {
    const result = await sendTenantEmail('org-1', { to: '   ', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'Missing recipient' });
  });

  it('returns sent: false when organizationId is null', async () => {
    const result = await sendTenantEmail(null, { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'Missing organization context' });
    expect(mockGetMarketingConfig).not.toHaveBeenCalled();
  });

  it('returns sent: false when organizationId is empty string', async () => {
    const result = await sendTenantEmail('', { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'Missing organization context' });
  });

  it('returns sent: false when getMarketingConfig throws', async () => {
    mockGetMarketingConfig.mockRejectedValueOnce(new Error('DB error'));
    const result = await sendTenantEmail('org-1', { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'DB error' });
  });

  it('returns sent: false when no email provider configured', async () => {
    mockGetMarketingConfig.mockResolvedValueOnce({ providers: [], defaultEmailProvider: null });
    const result = await sendTenantEmail('org-1', { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({
      sent: false,
      error: 'No email provider configured. Configure Resend or SMTP in Settings > Integrations.',
    });
  });

  it('returns sent: false when provider has no sender email', async () => {
    mockGetMarketingConfig.mockResolvedValueOnce({
      providers: [
        { providerType: 'resend', enabled: true, apiKey: 're_xxx', senderEmail: '', senderName: '' },
      ],
      defaultEmailProvider: 'resend',
    });
    const result = await sendTenantEmail('org-1', { to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(result).toEqual({ sent: false, error: 'Sender email not configured for this provider' });
  });

  describe('Resend path', () => {
    beforeEach(() => {
      mockGetMarketingConfig.mockResolvedValue({
        providers: [
          {
            providerType: 'resend',
            enabled: true,
            apiKey: 're_xxx',
            senderEmail: 'noreply@example.com',
            senderName: 'Example',
          },
        ],
        defaultEmailProvider: null,
      });
    });

    it('returns sent: true when Resend send succeeds', async () => {
      const result = await sendTenantEmail('org-1', {
        to: 'client@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });
      expect(result).toEqual({ sent: true });
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('noreply@example.com'),
          to: ['client@example.com'],
          subject: 'Test',
          html: '<p>Hello</p>',
        })
      );
    });

    it('includes reply_to when replyTo provided', async () => {
      await sendTenantEmail('org-1', {
        to: 'c@b.com',
        subject: 'S',
        html: '<p>H</p>',
        replyTo: 'reply@example.com',
      });
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({ reply_to: 'reply@example.com' })
      );
    });

    it('returns sent: false when Resend returns error', async () => {
      mockResendSend.mockResolvedValueOnce({ error: { message: 'Invalid API key' } });
      const result = await sendTenantEmail('org-1', {
        to: 'a@b.com',
        subject: 'S',
        html: '<p>H</p>',
      });
      expect(result).toEqual({ sent: false, error: 'Invalid API key' });
    });

    it('returns sent: false when Resend throws', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('Network error'));
      const result = await sendTenantEmail('org-1', {
        to: 'a@b.com',
        subject: 'S',
        html: '<p>H</p>',
      });
      expect(result).toEqual({ sent: false, error: 'Network error' });
    });
  });

  describe('SMTP path', () => {
    beforeEach(() => {
      mockGetMarketingConfig.mockResolvedValue({
        providers: [
          {
            providerType: 'smtp',
            enabled: true,
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            user: 'user@example.com',
            apiSecret: 'secret',
            senderEmail: 'noreply@example.com',
            senderName: 'Example',
          },
        ],
        defaultEmailProvider: null,
      });
    });

    it('returns sent: true when SMTP sendMail succeeds', async () => {
      const result = await sendTenantEmail('org-1', {
        to: 'client@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });
      expect(result).toEqual({ sent: true });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth: { user: 'user@example.com', pass: 'secret' },
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'client@example.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        })
      );
    });

    it('includes replyTo in mailOptions when replyTo provided', async () => {
      await sendTenantEmail('org-1', {
        to: 'c@b.com',
        subject: 'S',
        html: '<p>H</p>',
        replyTo: 'reply@example.com',
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: 'reply@example.com' })
      );
    });

    it('returns sent: false when SMTP sendMail throws', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection timeout'));
      const result = await sendTenantEmail('org-1', {
        to: 'a@b.com',
        subject: 'S',
        html: '<p>H</p>',
      });
      expect(result).toEqual({ sent: false, error: 'Connection timeout' });
    });
  });

  it('uses defaultEmailProvider when set', async () => {
    mockGetMarketingConfig.mockResolvedValue({
      providers: [
        { providerType: 'resend', enabled: true, apiKey: 're_xxx', senderEmail: 'r@b.com', senderName: '' },
        { providerType: 'smtp', enabled: true, host: 'smtp.x.com', user: 'u', apiSecret: 's', senderEmail: 's@b.com', senderName: '' },
      ],
      defaultEmailProvider: 'smtp',
    });
    const result = await sendTenantEmail('org-1', { to: 'a@b.com', subject: 'S', html: '<p>H</p>' });
    expect(result).toEqual({ sent: true });
    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('filters out disabled providers', async () => {
    mockGetMarketingConfig.mockResolvedValue({
      providers: [
        { providerType: 'resend', enabled: false, apiKey: 're_xxx', senderEmail: 'r@b.com', senderName: '' },
      ],
      defaultEmailProvider: null,
    });
    const result = await sendTenantEmail('org-1', { to: 'a@b.com', subject: 'S', html: '<p>H</p>' });
    expect(result.sent).toBe(false);
    expect(result.error).toContain('No email provider configured');
  });

  it('returns sent: false when only non-email providers (e.g. mailchimp) are configured', async () => {
    mockGetMarketingConfig.mockResolvedValue({
      providers: [
        { providerType: 'mailchimp', enabled: true, apiKey: 'x', senderEmail: 'a@b.com', senderName: '' },
      ],
      defaultEmailProvider: null,
    });
    const result = await sendTenantEmail('org-1', { to: 'a@b.com', subject: 'S', html: '<p>H</p>' });
    expect(result).toEqual({
      sent: false,
      error: 'No email provider configured. Configure Resend or SMTP in Settings > Integrations.',
    });
  });
});
