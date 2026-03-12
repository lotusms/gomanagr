/**
 * Unit tests for Step2PersonalInfo: render, first/last name, purpose, role, updateData
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step2PersonalInfo from '@/components/signup/Step2PersonalInfo';

jest.mock('@/components/ui', () => ({
  InputField: ({ id, label, value, onChange, placeholder, error }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-label={label} value={value} onChange={onChange} placeholder={placeholder} data-error={error} />
    </div>
  ),
  ChipsSingle: ({ id, label, value, onValueChange, options }) => (
    <div data-testid={`chips-${id}`}>
      <label>{label}</label>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onValueChange(opt)}>{opt}</button>
      ))}
      <span data-value={value}>{value}</span>
    </div>
  ),
}));

describe('Step2PersonalInfo', () => {
  it('renders heading and form fields', () => {
    const updateData = jest.fn();
    render(<Step2PersonalInfo data={{}} updateData={updateData} errors={{}} />);
    expect(screen.getByRole('heading', { name: 'Tell us about yourself' })).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByTestId('chips-purpose')).toBeInTheDocument();
    expect(screen.getByTestId('chips-role')).toBeInTheDocument();
  });

  it('calls updateData when first name and last name change', async () => {
    const updateData = jest.fn();
    render(<Step2PersonalInfo data={{}} updateData={updateData} errors={{}} />);
    await userEvent.type(screen.getByLabelText('First Name'), 'Jane');
    expect(updateData).toHaveBeenCalledWith({ firstName: 'Jane' });
    await userEvent.type(screen.getByLabelText('Last Name'), 'Doe');
    expect(updateData).toHaveBeenCalledWith({ lastName: 'Doe' });
  });

  it('calls updateData when purpose and role are selected', async () => {
    const updateData = jest.fn();
    render(<Step2PersonalInfo data={{}} updateData={updateData} errors={{}} />);
    const purposeButtons = screen.getByTestId('chips-purpose').querySelectorAll('button');
    await userEvent.click(purposeButtons[0]);
    expect(updateData).toHaveBeenCalledWith({ purpose: 'Work' });
    const roleButtons = screen.getByTestId('chips-role').querySelectorAll('button');
    await userEvent.click(roleButtons[0]);
    expect(updateData).toHaveBeenCalledWith({ role: 'Owner' });
  });

  it('initializes from data.firstName and data.lastName', () => {
    render(<Step2PersonalInfo data={{ firstName: 'John', lastName: 'Smith' }} updateData={jest.fn()} errors={{}} />);
    expect(screen.getByLabelText('First Name')).toHaveValue('John');
    expect(screen.getByLabelText('Last Name')).toHaveValue('Smith');
  });

  it('displays errors when errors prop has values', () => {
    render(<Step2PersonalInfo data={{}} updateData={jest.fn()} errors={{ firstName: 'Required', purpose: 'Select one' }} />);
    expect(screen.getByLabelText('First Name')).toHaveAttribute('data-error', 'Required');
  });
});
