/**
 * Unit tests for OnlineResourceLogCards:
 * - Renders a card per resource with type, date, name, url, description
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnlineResourceLogCards from '@/components/clients/add-client/OnlineResourceLogCards';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('OnlineResourceLogCards', () => {
  const resources = [
    {
      id: 'r1',
      resource_name: 'Client Google Drive',
      resource_type: 'google_drive_folder',
      url: 'https://drive.google.com/drive/folders/abc',
      date_added: '2026-02-27',
      description: 'Shared folder for assets',
    },
    {
      id: 'r2',
      resource_name: 'Client Website',
      resource_type: 'client_website',
      url: 'https://example.com',
      created_at: '2026-02-26T12:00:00Z',
      description: '',
    },
  ];

  it('renders a card per resource with name, type, and url', () => {
    render(<OnlineResourceLogCards resources={resources} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('Client Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Client Website')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Client website')).toBeInTheDocument();
    expect(screen.getByText(/drive.google.com/)).toBeInTheDocument();
    expect(screen.getByText(/Shared folder for assets/)).toBeInTheDocument();
  });

  it('calls onSelect with resource id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<OnlineResourceLogCards resources={resources} onSelect={onSelect} onDelete={() => {}} />);

    await userEvent.click(screen.getByText('Client Google Drive').closest('[role="button"]'));

    expect(onSelect).toHaveBeenCalledWith('r1');
  });

  it('calls onDelete with resource id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<OnlineResourceLogCards resources={resources} onSelect={() => {}} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete resource' });
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('r1');
  });
});
