/**
 * Unit tests for RecipientSelector: dropdowns, labels, selected list visibility.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipientSelector from '@/components/marketing/RecipientSelector';
import { RECIPIENT_GROUPS, AUDIENCE_MODES } from '@/lib/marketing/types';

jest.mock('@/components/ui/Dropdown', () => function MockDropdown({ id, label, value, onChange, options, disabled }) {
  return (
    <div data-testid={`dropdown-${id}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange && onChange(e)}
        disabled={disabled}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
});
jest.mock('@/components/ui/SearchableMultiselect', () => function MockSearchableMultiselect({ options, value }) {
  return (
    <div data-testid="searchable-multiselect">
      <span data-testid="count">{value.length} of {options.length}</span>
    </div>
  );
});
jest.mock('@/components/ui/formControlStyles', () => ({ getLabelClasses: () => 'label-class' }));

describe('RecipientSelector', () => {
  const defaultProps = {
    recipientGroup: RECIPIENT_GROUPS.CLIENTS,
    onRecipientGroupChange: jest.fn(),
    audienceMode: AUDIENCE_MODES.ALL,
    onAudienceModeChange: jest.fn(),
    recipientOptions: [{ value: 'id1', label: 'Alice' }, { value: 'id2', label: 'Bob' }],
    selectedIds: [],
    onSelectedIdsChange: jest.fn(),
  };

  it('renders recipient type and audience dropdowns with default labels', () => {
    render(<RecipientSelector {...defaultProps} />);
    expect(screen.getByLabelText('Recipient type')).toBeInTheDocument();
    expect(screen.getByLabelText('Audience')).toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    render(
      <RecipientSelector
        {...defaultProps}
        recipientGroupLabel="Who to send to"
        audienceLabel="Scope"
      />
    );
    expect(screen.getByLabelText('Who to send to')).toBeInTheDocument();
    expect(screen.getByLabelText('Scope')).toBeInTheDocument();
  });

  it('shows SearchableMultiselect when audienceMode is selected', () => {
    render(
      <RecipientSelector
        {...defaultProps}
        audienceMode={AUDIENCE_MODES.SELECTED}
      />
    );
    expect(screen.getByTestId('searchable-multiselect')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('0 of 2');
  });

  it('shows warning when audienceMode is selected and no recipients selected', () => {
    render(
      <RecipientSelector
        {...defaultProps}
        audienceMode={AUDIENCE_MODES.SELECTED}
      />
    );
    expect(screen.getByText('Select at least one recipient to continue.')).toBeInTheDocument();
  });

  it('calls onRecipientGroupChange when recipient type changes', async () => {
    const onRecipientGroupChange = jest.fn();
    render(
      <RecipientSelector
        {...defaultProps}
        onRecipientGroupChange={onRecipientGroupChange}
      />
    );
    const select = screen.getByLabelText('Recipient type');
    await userEvent.selectOptions(select, RECIPIENT_GROUPS.TEAM);
    expect(onRecipientGroupChange).toHaveBeenCalled();
  });

  it('passes disabled to dropdowns when disabled', () => {
    render(<RecipientSelector {...defaultProps} disabled />);
    expect(screen.getByLabelText('Recipient type')).toBeDisabled();
    expect(screen.getByLabelText('Audience')).toBeDisabled();
  });
});
