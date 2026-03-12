/**
 * Unit tests for SendInvoiceDialog:
 * - Validation: empty email, invalid email
 * - Submit calls /api/send-invoice-email with correct body (userId, invoiceId, to, isReminder)
 * - onSuccess called on 200
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SendInvoiceDialog from '@/components/invoices/SendInvoiceDialog';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

describe('SendInvoiceDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    invoiceId: 'inv-1',
    userId: 'u1',
    defaultTo: 'client@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('shows recipient email field and send button when open', () => {
    render(<SendInvoiceDialog {...defaultProps} />);
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send invoice/i })).toBeInTheDocument();
  });

  it('shows "Send reminder" when isReminder is true', () => {
    render(<SendInvoiceDialog {...defaultProps} isReminder />);
    expect(screen.getByRole('button', { name: /send reminder/i })).toBeInTheDocument();
  });

  it('shows validation error when submitting empty email', async () => {
    render(<SendInvoiceDialog {...defaultProps} defaultTo="" />);
    const input = screen.getByLabelText(/recipient email/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /send invoice/i }));
    expect(await screen.findByText(/enter the recipient email/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not call fetch when email is invalid (validation blocks submit)', async () => {
    render(<SendInvoiceDialog {...defaultProps} defaultTo="not-an-email" />);
    fireEvent.click(screen.getByRole('button', { name: /send invoice/i }));
    await waitFor(() => {}, { timeout: 300 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with correct body and onSuccess on 200', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<SendInvoiceDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /send invoice/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/send-invoice-email',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.userId).toBe('u1');
    expect(body.invoiceId).toBe('inv-1');
    expect(body.to).toBe('client@example.com');
    expect(body.isReminder).toBe(false);
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('sends isReminder true when dialog opened as reminder', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<SendInvoiceDialog {...defaultProps} isReminder defaultTo="a@b.com" />);
    fireEvent.click(screen.getByRole('button', { name: /send reminder/i }));
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.isReminder).toBe(true);
  });

  it('shows error message when fetch fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'SMTP failed' }) });
    render(<SendInvoiceDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /send invoice/i }));
    expect(await screen.findByText(/SMTP failed/i)).toBeInTheDocument();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });
});
