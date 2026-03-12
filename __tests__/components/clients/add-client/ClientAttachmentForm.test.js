/**
 * Unit tests for ClientAttachmentForm:
 * - Strips upload prefix from initial file name (e.g. TEST.pdf)
 * - Renders Status dropdown (Draft, Approved, Declined) and File type dropdown
 * - Fetches contracts and shows Linked contract dropdown
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientAttachmentForm from '@/components/clients/add-client/ClientAttachmentForm';

jest.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', push: jest.fn(), replace: jest.fn(), query: {} }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/UserAccountContext', () => ({ useOptionalUserAccount: () => null }));

describe('ClientAttachmentForm', () => {
  const defaultProps = {
    clientId: 'c1',
    userId: 'u1',
    onSuccess: () => {},
    onCancel: () => {},
  };

  beforeEach(() => {
    global.fetch = jest.fn((url, opts) => {
      if (typeof url === 'string' && url.includes('get-client-contracts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contracts: [] }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url));
    });
  });

  afterEach(() => {
    global.fetch?.mockRestore?.();
  });

  it('shows stripped file name in File name input when initial has upload-prefixed file_name', async () => {
    render(
      <ClientAttachmentForm
        {...defaultProps}
        initial={{ file_name: '1772380654927-4ox18iujs-TEST.pdf', file_type: 'pdf' }}
      />
    );
    const fileInput = await screen.findByLabelText(/File name/i);
    expect(fileInput).toHaveValue('TEST.pdf');
  });

  it('shows stripped name from file_url when initial file_name is empty', async () => {
    render(
      <ClientAttachmentForm
        {...defaultProps}
        initial={{
          file_name: '',
          file_url: 'https://example.com/uploads/1772380654927-abc-Report.pdf',
          file_type: 'pdf',
        }}
      />
    );
    const fileInput = await screen.findByLabelText(/File name/i);
    expect(fileInput).toHaveValue('Report.pdf');
  });

  it('renders Status dropdown with Draft, Approved, Declined', async () => {
    render(<ClientAttachmentForm {...defaultProps} />);
    const statusDropdown = await screen.findByLabelText(/Status/i);
    expect(statusDropdown).toBeInTheDocument();
    await userEvent.click(statusDropdown);
    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Approved' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Declined' })).toBeInTheDocument();
  });

  it('renders File type dropdown', async () => {
    render(<ClientAttachmentForm {...defaultProps} />);
    expect(await screen.findByLabelText(/File type/i)).toBeInTheDocument();
  });

  it('fetches contracts and renders Linked contract dropdown', async () => {
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('get-client-contracts')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              contracts: [
                { id: 'con-1', contract_number: 'C001', contract_title: 'Main Agreement' },
              ],
            }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(<ClientAttachmentForm {...defaultProps} />);
    expect(await screen.findByLabelText(/Linked contract/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/get-client-contracts',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u1', clientId: 'c1', organizationId: undefined }),
      })
    );
  });

  it('shows file name from non-http file_url when file_name is empty', async () => {
    render(
      <ClientAttachmentForm
        {...defaultProps}
        initial={{ file_name: '', file_url: '/uploads/doc.pdf', file_type: 'pdf' }}
      />
    );
    const fileInput = await screen.findByLabelText(/File name/i);
    expect(fileInput).toHaveValue('/uploads/doc.pdf');
  });

  it('shows empty file name when file_url is invalid and URL parse throws', async () => {
    render(
      <ClientAttachmentForm
        {...defaultProps}
        initial={{ file_name: '', file_url: 'http://', file_type: 'pdf' }}
      />
    );
    const fileInput = await screen.findByLabelText(/File name/i);
    expect(fileInput).toHaveValue('');
  });

  it('calls create-client-attachment and onSuccess when creating', async () => {
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (typeof url === 'string' && url.includes('create-client-attachment')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-att' }) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    const onSuccess = jest.fn();
    render(<ClientAttachmentForm {...defaultProps} onSuccess={onSuccess} />);
    await screen.findByLabelText(/Linked contract/i);
    const nameInput = screen.getByLabelText(/File name/i);
    fireEvent.change(nameInput, { target: { value: 'report.pdf' } });
    fireEvent.submit(document.querySelector('form'));
    await screen.findByRole('button', { name: /saving/i }).catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/create-client-attachment',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const createCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('create-client-attachment'));
    if (createCall) {
      const body = JSON.parse(createCall[1].body);
      expect(body.file_name).toBe('report.pdf');
      expect(body.clientId).toBe('c1');
    }
  });

  it('calls update-client-attachment with attachmentId when updating', async () => {
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (typeof url === 'string' && url.includes('update-client-attachment')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    const onSuccess = jest.fn();
    render(
      <ClientAttachmentForm
        {...defaultProps}
        attachmentId="att-99"
        onSuccess={onSuccess}
        initial={{ file_name: 'x.pdf' }}
      />
    );
    await screen.findByLabelText(/Linked contract/i);
    fireEvent.submit(document.querySelector('form'));
    await new Promise((r) => setTimeout(r, 100));
    const updateCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('update-client-attachment'));
    expect(updateCall).toBeDefined();
    const body = JSON.parse(updateCall[1].body);
    expect(body.attachmentId).toBe('att-99');
  });

  it('shows error and does not call onSuccess when create fails', async () => {
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      if (typeof url === 'string' && url.includes('create-client-attachment')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Validation failed' }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    const onSuccess = jest.fn();
    render(<ClientAttachmentForm {...defaultProps} onSuccess={onSuccess} />);
    await screen.findByLabelText(/Linked contract/i);
    fireEvent.submit(document.querySelector('form'));
    await screen.findByText('Validation failed');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('renders with industry prop and shows Linked contract dropdown', async () => {
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
    render(<ClientAttachmentForm {...defaultProps} industry="healthcare" />);
    expect(await screen.findByLabelText(/Linked contract/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/File name/i)).toBeInTheDocument();
  });
});
