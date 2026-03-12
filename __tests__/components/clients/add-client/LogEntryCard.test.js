/**
 * Unit tests for LogEntryCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogEntryCard from '@/components/clients/add-client/LogEntryCard';

jest.mock('@/components/clients/add-client/CardDeleteButton', () => {
  return function MockCardDeleteButton({ onDelete, title }) {
    return (
      <button type="button" onClick={onDelete} title={title}>
        Remove
      </button>
    );
  };
});

describe('LogEntryCard', () => {
  it('renders textarea with value and aria-label', () => {
    render(
      <LogEntryCard
        id="msg-1"
        value="Some note"
        onChange={() => {}}
        onRemove={() => {}}
        ariaLabel="Message details"
        borderClass="border-l-blue-500"
      />
    );
    const textarea = screen.getByRole('textbox', { name: 'Message details' });
    expect(textarea).toHaveValue('Some note');
    expect(textarea).toHaveAttribute('id', 'msg-1');
  });

  it('calls onChange when text changes', async () => {
    const onChange = jest.fn();
    render(
      <LogEntryCard
        id="m1"
        value=""
        onChange={onChange}
        onRemove={() => {}}
        ariaLabel="Details"
        borderClass="border-l-gray-400"
      />
    );
    await userEvent.type(screen.getByRole('textbox'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = jest.fn();
    render(
      <LogEntryCard
        id="m1"
        value=""
        onChange={() => {}}
        onRemove={onRemove}
        ariaLabel="Details"
        borderClass="border-l-gray-400"
      />
    );
    await userEvent.click(screen.getByTitle('Remove entry'));
    expect(onRemove).toHaveBeenCalled();
  });
});
