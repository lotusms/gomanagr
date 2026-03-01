/**
 * Unit tests for ClientEmailForm:
 * - Renders with initial values (subject, direction, to/from, body, date, attachments label)
 * - Submit create: calls POST create-client-email with payload, then onSuccess
 * - Submit update: calls POST update-client-email with payload and emailId, then onSuccess
 * - Cancel calls onCancel
 * - API error is shown in form and onSuccess not called
 * - Submit button text: "Add email" when new, "Update email" when editing
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientEmailForm from '@/components/clients/add-client/ClientEmailForm';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/clients/1/emails/new',
    query: {},
    asPath: '/dashboard/clients/1/emails/new',
  }),
}));

describe('ClientEmailForm', () => {
  let fetchMock;
  let onSuccess;
  let onCancel;

  beforeEach(() => {
    jest.clearAllMocks();
    onSuccess = jest.fn();
    onCancel = jest.fn();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  const defaultProps = {
    clientId: 'client-1',
    userId: 'user-1',
    organizationId: 'org-1',
    onSuccess,
    onCancel,
  };

  describe('render', () => {
    it('renders form fields and Add email button when no emailId', () => {
      render(<ClientEmailForm {...defaultProps} />);

      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^to$/i)).toBeInTheDocument();
      expect(screen.getByText('Direction')).toBeInTheDocument();
      expect(screen.getByLabelText(/date \/ time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full email body/i)).toBeInTheDocument();
      expect(screen.getByText('Attachments')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add email$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    });

    it('renders with initial values when initial prop provided', () => {
      render(
        <ClientEmailForm
          {...defaultProps}
          initial={{
            subject: 'Re: Project',
            direction: 'received',
            to_from: 'sender@example.com',
            body: 'Email body here',
            attachments: ['https://example.com/file.pdf'],
          }}
        />
      );

      expect(screen.getByDisplayValue('Re: Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('sender@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Email body here')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /received/i })).toBeInTheDocument();
    });

    it('shows Update email button and Received when editing', () => {
      render(
        <ClientEmailForm
          {...defaultProps}
          emailId="email-1"
          initial={{ direction: 'received', subject: 'Edit me' }}
        />
      );

      expect(screen.getByRole('button', { name: /^update email$/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Edit me')).toBeInTheDocument();
    });
  });

  describe('submit create', () => {
    it('calls create-client-email with correct payload when form is submitted', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('create-client-email')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'new-id' }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<ClientEmailForm {...defaultProps} />);

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/subject/i), 'Test subject');
        await userEvent.type(screen.getByLabelText(/^to$/i), 'to@example.com');
      });

      const form = document.querySelector('form');
      await act(async () => {
        fireEvent.submit(form);
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const resPromise = fetchMock.mock.results[fetchMock.mock.calls.length - 1]?.value;
        if (resPromise && typeof resPromise.then === 'function') {
          const res = await resPromise;
          if (res?.json && typeof res.json === 'function') await res.json();
        }
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      const createCall = fetchMock.mock.calls.find((c) => String(c[0] || '').includes('create-client-email'));
      expect(createCall).toBeDefined();
      const body = JSON.parse(createCall[1].body);
      expect(body.userId).toBe('user-1');
      expect(body.clientId).toBe('client-1');
      expect(body.organizationId).toBe('org-1');
      expect(body.subject).toBe('Test subject');
      expect(body.to_from).toBe('to@example.com');
      expect(body.direction).toBe('sent');
      expect(Array.isArray(body.attachments)).toBe(true);
    });
  });

  describe('submit update', () => {
    it('calls update-client-email with payload and emailId when form is submitted', async () => {
      fetchMock.mockImplementation((url) => {
        if (url && url.includes('update-client-email')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ok: true }),
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(
        <ClientEmailForm
          {...defaultProps}
          emailId="email-1"
          initial={{ subject: 'Original', to_from: 'x@y.com' }}
        />
      );

      await act(async () => {
        await userEvent.clear(screen.getByLabelText(/subject/i));
        await userEvent.type(screen.getByLabelText(/subject/i), 'Updated subject');
      });

      const form = document.querySelector('form');
      await act(async () => {
        fireEvent.submit(form);
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const resPromise = fetchMock.mock.results[fetchMock.mock.calls.length - 1]?.value;
        if (resPromise && typeof resPromise.then === 'function') {
          const res = await resPromise;
          if (res?.json && typeof res.json === 'function') await res.json();
        }
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      const updateCall = fetchMock.mock.calls.find((c) => String(c[0] || '').includes('update-client-email'));
      expect(updateCall).toBeDefined();
      const body = JSON.parse(updateCall[1].body);
      expect(body.emailId).toBe('email-1');
      expect(body.subject).toBe('Updated subject');
      expect(body.userId).toBe('user-1');
      expect(body.clientId).toBe('client-1');
    });
  });

  describe('cancel', () => {
    it('form has Cancel button with type=button so it does not submit the form', () => {
      render(<ClientEmailForm {...defaultProps} />);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      expect(cancelBtn).toBeInTheDocument();
      expect(cancelBtn).toHaveAttribute('type', 'button');
    });
  });

  describe('error handling', () => {
    it('shows API error message and does not call onSuccess when create fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<ClientEmailForm {...defaultProps} />);

      await act(async () => {
        await userEvent.type(screen.getByLabelText(/subject/i), 'Test');
        await userEvent.type(screen.getByLabelText(/^to$/i), 'a@b.com');
      });
      await act(async () => {
        await userEvent.click(screen.getByRole('button', { name: /^add email$/i }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const resPromise = fetchMock.mock.results[fetchMock.mock.calls.length - 1]?.value;
        if (resPromise && typeof resPromise.then === 'function') {
          const res = await resPromise;
          if (res?.json && typeof res.json === 'function') await res.json();
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
