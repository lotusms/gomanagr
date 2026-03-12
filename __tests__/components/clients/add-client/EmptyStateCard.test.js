/**
 * Unit tests for EmptyStateCard
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyStateCard from '@/components/clients/add-client/EmptyStateCard';

describe('EmptyStateCard', () => {
  it('renders message', () => {
    render(<EmptyStateCard message="No entries yet." />);
    expect(screen.getByText('No entries yet.')).toBeInTheDocument();
  });

  it('renders optional action when provided', () => {
    render(
      <EmptyStateCard
        message="No files."
        action={<button type="button">Add file</button>}
      />
    );
    expect(screen.getByText('No files.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add file' })).toBeInTheDocument();
  });

  it('renders without action', () => {
    const { container } = render(<EmptyStateCard message="Empty." />);
    expect(screen.getByText('Empty.')).toBeInTheDocument();
    expect(container.querySelector('.mb-4')).not.toBeInTheDocument();
  });
});
