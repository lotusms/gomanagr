/**
 * Unit tests for Step6Referral: render, referral selection, updateData, errors
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step6Referral from '@/components/signup/Step6Referral';

jest.mock('@/components/ui', () => ({
  ChipsSingle: ({ id, label, value, onValueChange, options, error }) => (
    <div data-testid="chips-single">
      <label>{label}</label>
      {error && <span data-testid="error">{error}</span>}
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onValueChange(opt)}>
          {opt}
        </button>
      ))}
      <span data-value={value}>{value}</span>
    </div>
  ),
}));

describe('Step6Referral', () => {
  it('renders heading and referral options', () => {
    const updateData = jest.fn();
    render(<Step6Referral data={{}} updateData={updateData} errors={{}} />);
    expect(screen.getByRole('heading', { name: 'How did you hear about us?' })).toBeInTheDocument();
    expect(screen.getByText(/Help us understand/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Referral' })).toBeInTheDocument();
  });

  it('calls updateData with referralSource when option is selected', async () => {
    const updateData = jest.fn();
    render(<Step6Referral data={{}} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Google' }));
    expect(updateData).toHaveBeenCalledWith({ referralSource: 'Google' });
  });

  it('shows selected value from data', () => {
    render(<Step6Referral data={{ referralSource: 'Referral' }} updateData={jest.fn()} errors={{}} />);
    const chips = screen.getByTestId('chips-single');
    expect(chips.querySelector('[data-value="Referral"]')).toHaveTextContent('Referral');
  });

  it('displays error when errors.referralSource is set', () => {
    render(<Step6Referral data={{}} updateData={jest.fn()} errors={{ referralSource: 'Required' }} />);
    expect(screen.getByTestId('error')).toHaveTextContent('Required');
  });
});
