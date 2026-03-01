/**
 * Unit tests for ClientAttachmentForm:
 * - Strips upload prefix from initial file name (e.g. TEST.pdf)
 * - Renders Status dropdown (Draft, Approved, Declined) and File type dropdown
 * - Fetches contracts and shows Linked contract dropdown
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
