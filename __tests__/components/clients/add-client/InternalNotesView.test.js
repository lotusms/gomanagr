/**
 * Unit tests for InternalNotesView
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InternalNotesView from '@/components/clients/add-client/InternalNotesView';

describe('InternalNotesView', () => {
  it('renders private disclaimer with client term', () => {
    render(<InternalNotesView value="" onChange={() => {}} />);
    expect(screen.getByText(/Private—not visible to client/)).toBeInTheDocument();
  });

  it('uses custom clientTermSingularLower', () => {
    render(
      <InternalNotesView value="" onChange={() => {}} clientTermSingularLower="patient" />
    );
    expect(screen.getByText(/Private—not visible to patient/)).toBeInTheDocument();
  });

  it('renders textarea with placeholder and value', () => {
    render(
      <InternalNotesView value="Secret note" onChange={() => {}} />
    );
    const textarea = screen.getByPlaceholderText(/Private notes about this client/);
    expect(textarea).toHaveValue('Secret note');
  });

  it('calls onChange when user types', async () => {
    const onChange = jest.fn();
    render(<InternalNotesView value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'x');
    expect(onChange).toHaveBeenCalled();
  });
});
