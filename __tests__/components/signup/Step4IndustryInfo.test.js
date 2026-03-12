/**
 * Unit tests for Step4IndustryInfo: render, industry selection, updateData, errors
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step4IndustryInfo from '@/components/signup/Step4IndustryInfo';

jest.mock('@/components/ui', () => ({
  ChipsSingle: ({ id, label, value, onValueChange, options, error }) => (
    <div data-testid="chips-single">
      <label htmlFor={id}>{label}</label>
      {error && <span data-testid="error">{error}</span>}
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onValueChange(opt.value)} data-value={opt.value}>
          {opt.label}
        </button>
      ))}
      <span data-value={value}>{value}</span>
    </div>
  ),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  INDUSTRIES: [
    { value: 'general', label: 'General' },
    { value: 'healthcare', label: 'Healthcare' },
  ],
}));

describe('Step4IndustryInfo', () => {
  it('renders heading and industry chips', () => {
    const updateData = jest.fn();
    render(<Step4IndustryInfo data={{}} updateData={updateData} errors={{}} />);
    expect(screen.getByRole('heading', { name: 'Industry Information' })).toBeInTheDocument();
    expect(screen.getByText(/Select your industry/)).toBeInTheDocument();
    expect(screen.getByTestId('chips-single')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Healthcare' })).toBeInTheDocument();
  });

  it('calls updateData with industry when option is selected', async () => {
    const updateData = jest.fn();
    render(<Step4IndustryInfo data={{}} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Healthcare' }));
    expect(updateData).toHaveBeenCalledWith({ industry: 'healthcare' });
  });

  it('shows selected industry from data', () => {
    render(<Step4IndustryInfo data={{ industry: 'healthcare' }} updateData={jest.fn()} errors={{}} />);
    expect(screen.getByText('healthcare').closest('[data-value]')).toHaveAttribute('data-value', 'healthcare');
  });

  it('displays error when errors.industry is set', () => {
    render(<Step4IndustryInfo data={{}} updateData={jest.fn()} errors={{ industry: 'Please select' }} />);
    expect(screen.getByTestId('error')).toHaveTextContent('Please select');
  });
});
