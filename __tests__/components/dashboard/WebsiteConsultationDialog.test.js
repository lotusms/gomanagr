/**
 * Unit tests for WebsiteConsultationDialog:
 * - Renders when open; null when closed; default values; form fields
 * - Close via button, backdrop, Escape; body overflow
 * - Submit success (fetch 200, submitted state, onSuccess); submit error (res.ok false); submit catch
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WebsiteConsultationDialog from '@/components/dashboard/WebsiteConsultationDialog';

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, type, disabled, onClick }) => (
    <button type={type} onClick={onClick} disabled={disabled} data-testid="primary-btn">
      {children}
    </button>
  ),
  SecondaryButton: ({ children, type, onClick }) => (
    <button type={type || 'button'} onClick={onClick} data-testid="secondary-btn">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/InputField', () => function MockInputField({ id, label, value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={onChange} placeholder={placeholder} aria-label={label} />
    </div>
  );
});

jest.mock('@/components/ui/PhoneNumberInput', () => function MockPhoneNumberInput({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="tel" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
});

jest.mock('@/components/ui/TextareaInput', () => function MockTextareaInput({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} onChange={onChange} aria-label={label} />
    </div>
  );
});

jest.mock('react-icons/hi', () => ({
  HiX: () => <span data-testid="close-icon">×</span>,
}));

describe('WebsiteConsultationDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('returns null when open is false', () => {
    const { container } = render(
      <WebsiteConsultationDialog open={false} onClose={mockOnClose} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with title and form when open', () => {
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    expect(screen.getByRole('dialog', { name: /request a website consultation/i })).toBeInTheDocument();
    expect(screen.getByText(/LOTUS Marketing Solutions can help you/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Company / Organization')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByLabelText(/Message \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeInTheDocument();
  });

  it('initializes form with default values when open', () => {
    render(
      <WebsiteConsultationDialog
        open
        onClose={mockOnClose}
        defaultName="Jane"
        defaultEmail="jane@example.com"
        defaultCompany="Acme"
      />
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Company / Organization')).toHaveValue('Acme');
  });

  it('calls onClose when Close button is clicked', async () => {
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('submits form and shows success state on 200', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/website-consultation',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    ));
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.name).toBe('Jane');
    expect(body.email).toBe('jane@example.com');
    await waitFor(() => expect(screen.getByText(/Request sent successfully/i)).toBeInTheDocument());
    expect(screen.getByText((content) => content.includes('be in touch'))).toBeInTheDocument();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('sends trimmed name, email, company, phone, message in body', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    const typeOpts = { delay: 1 };
    await userEvent.type(screen.getByLabelText('Name'), '  Jane Doe  ', typeOpts);
    await userEvent.type(screen.getByLabelText('Email'), ' jane@example.com ', typeOpts);
    await userEvent.type(screen.getByLabelText('Company / Organization'), ' Acme ', typeOpts);
    await userEvent.type(screen.getByLabelText('Phone'), '(717) 123-4567', typeOpts);
    await userEvent.type(screen.getByLabelText(/Message \(optional\)/i), ' Hello ', typeOpts);
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.name).toBe('Jane Doe');
    expect(body.email).toBe('jane@example.com');
    expect(body.company).toBe('Acme');
    expect(body.phone).toBe('7171234567');
    expect(body.message).toBe('Hello');
  }, 10000);

  it('shows error when response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid email' }),
    });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByText('Invalid email')).toBeInTheDocument());
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('shows data.error when response has error and no message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('shows generic error when response ok false and no message/error', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument());
  });

  it('shows error on fetch throw', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByText(/Failed to send request/i)).toBeInTheDocument());
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('shows Sending… and disables submit while submitting', async () => {
    let resolveFetch;
    global.fetch.mockImplementationOnce(() => new Promise((r) => { resolveFetch = r; }));
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sending…' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    resolveFetch({ ok: true, json: () => Promise.resolve({}) });
    await waitFor(() => expect(screen.getByText(/Request sent successfully/i)).toBeInTheDocument());
  });

  it('uses phone.trim when phone has no digits (unformatPhone returns empty)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Phone'), 'no-digits');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.phone).toBe('no-digits');
  });

  it('success view Close button calls onClose', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<WebsiteConsultationDialog open onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(screen.getByText(/Request sent successfully/i)).toBeInTheDocument());
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await userEvent.click(closeButtons[closeButtons.length - 1]);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
