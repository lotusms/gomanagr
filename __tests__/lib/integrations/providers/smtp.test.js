/**
 * Unit tests for lib/integrations/providers/smtp.js
 */
const mockVerify = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  verify: mockVerify,
}));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: (...args) => mockCreateTransport(...args),
  },
}));

import { validateSmtpConfig, smtpMetadataFromConfig } from '@/lib/integrations/providers/smtp';

describe('smtp provider', () => {
  beforeEach(() => {
    mockCreateTransport.mockClear();
    mockVerify.mockReset();
    mockVerify.mockResolvedValue(undefined);
  });

  describe('validateSmtpConfig', () => {
    it('returns invalid when host missing', async () => {
      const result = await validateSmtpConfig({ user: 'u', password: 'p', fromEmail: 'a@b.com' });
      expect(result).toEqual({ ok: false, error: 'SMTP host is required', status: 'invalid' });
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('returns invalid when host empty or whitespace', async () => {
      expect(await validateSmtpConfig({ host: '', user: 'u', password: 'p', fromEmail: 'a@b.com' }))
        .toEqual({ ok: false, error: 'SMTP host is required', status: 'invalid' });
      expect(await validateSmtpConfig({ host: '  ', user: 'u', password: 'p', fromEmail: 'a@b.com' }))
        .toEqual({ ok: false, error: 'SMTP host is required', status: 'invalid' });
    });

    it('returns invalid when user missing', async () => {
      const result = await validateSmtpConfig({ host: 'smtp.example.com', password: 'p', fromEmail: 'a@b.com' });
      expect(result).toEqual({ ok: false, error: 'SMTP user is required', status: 'invalid' });
    });

    it('returns invalid when password missing', async () => {
      const result = await validateSmtpConfig({ host: 'smtp.example.com', user: 'u', fromEmail: 'a@b.com' });
      expect(result).toEqual({ ok: false, error: 'SMTP password is required', status: 'invalid' });
    });

    it('returns invalid when fromEmail missing', async () => {
      const result = await validateSmtpConfig({ host: 'smtp.example.com', user: 'u', password: 'p' });
      expect(result).toEqual({ ok: false, error: 'From email is required', status: 'invalid' });
    });

    it('returns connected when transporter.verify succeeds', async () => {
      const result = await validateSmtpConfig({
        host: 'smtp.example.com',
        user: 'user@example.com',
        password: 'secret',
        fromEmail: 'noreply@example.com',
      });
      expect(result).toEqual({ ok: true, status: 'connected' });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth: { user: 'user@example.com', pass: 'secret' },
        })
      );
      expect(mockVerify).toHaveBeenCalled();
    });

    it('uses custom port and secure when provided', async () => {
      await validateSmtpConfig({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        user: 'u',
        password: 'p',
        fromEmail: 'a@b.com',
      });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });

    it('accepts secure as string "true"', async () => {
      await validateSmtpConfig({
        host: 'smtp.example.com',
        secure: 'true',
        user: 'u',
        password: 'p',
        fromEmail: 'a@b.com',
      });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true })
      );
    });

    it('defaults port to 587 when port not provided', async () => {
      await validateSmtpConfig({
        host: 'smtp.example.com',
        user: 'u',
        password: 'p',
        fromEmail: 'a@b.com',
      });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587 })
      );
    });

    it('uses 587 when port is NaN', async () => {
      await validateSmtpConfig({
        host: 'smtp.example.com',
        port: 'invalid',
        user: 'u',
        password: 'p',
        fromEmail: 'a@b.com',
      });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587 })
      );
    });

    it('returns invalid when transporter.verify throws', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await validateSmtpConfig({
        host: 'smtp.example.com',
        user: 'u',
        password: 'p',
        fromEmail: 'a@b.com',
      });
      expect(result).toEqual({ ok: false, error: 'Connection refused', status: 'invalid' });
    });

    it('returns invalid with generic message when error has no message', async () => {
      mockVerify.mockRejectedValueOnce(new Error());
      const result = await validateSmtpConfig({
        host: 'smtp.example.com',
        user: 'u',
        password: 'p',
        fromEmail: 'a@b.com',
      });
      expect(result).toMatchObject({ ok: false, status: 'invalid' });
      expect(result.error).toBeDefined();
    });
  });

  describe('smtpMetadataFromConfig', () => {
    it('returns trimmed host, fromEmail, fromName', () => {
      const result = smtpMetadataFromConfig({
        host: '  smtp.example.com  ',
        fromEmail: '  a@b.com  ',
        fromName: '  Acme  ',
      });
      expect(result).toEqual({
        host: 'smtp.example.com',
        fromEmail: 'a@b.com',
        fromName: 'Acme',
      });
    });

    it('returns null for missing fields', () => {
      const result = smtpMetadataFromConfig({});
      expect(result).toEqual({ host: null, fromEmail: null, fromName: null });
    });

    it('handles undefined config', () => {
      const result = smtpMetadataFromConfig(undefined);
      expect(result).toEqual({ host: null, fromEmail: null, fromName: null });
    });
  });
});
