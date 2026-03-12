/**
 * Unit tests for Step3CompanyInfo: render, company name, logo upload/remove, locations, updateData
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step3CompanyInfo from '@/components/signup/Step3CompanyInfo';

jest.mock('@/components/ui', () => ({
  InputField: ({ id, label, value, onChange, placeholder, error }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-label={label} value={value} onChange={onChange} placeholder={placeholder} data-error={error} />
    </div>
  ),
  ChipsSingle: ({ id, label, value, onValueChange, options }) => (
    <div data-testid="chips-locations">
      <label>{label}</label>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onValueChange(opt)}>{opt}</button>
      ))}
    </div>
  ),
}));

jest.mock('@/components/ui/buttons', () => ({
  SecondaryButton: ({ children, onClick }) => (
    <button type="button" onClick={onClick} data-testid="upload-logo">{children}</button>
  ),
}));

describe('Step3CompanyInfo', () => {
  it('renders heading, company name field, and upload logo', () => {
    const updateData = jest.fn();
    render(<Step3CompanyInfo data={{}} updateData={updateData} errors={{}} />);
    expect(screen.getByRole('heading', { name: 'Company Information' })).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    expect(screen.getByTestId('upload-logo')).toHaveTextContent('Upload Logo');
    expect(screen.getByTestId('chips-locations')).toBeInTheDocument();
  });

  it('calls updateData when company name changes', async () => {
    const updateData = jest.fn();
    render(<Step3CompanyInfo data={{}} updateData={updateData} errors={{}} />);
    await userEvent.type(screen.getByLabelText('Company Name'), 'Acme Inc');
    expect(updateData).toHaveBeenCalledWith({ companyName: 'Acme Inc' });
  });

  it('calls updateData when locations is selected', async () => {
    const updateData = jest.fn();
    render(<Step3CompanyInfo data={{}} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByRole('button', { name: '2-5' }));
    expect(updateData).toHaveBeenCalledWith({ companyLocations: '2-5' });
  });

  it('shows logo preview and remove button when logoPreview is in data', () => {
    render(<Step3CompanyInfo data={{ logoPreview: 'data:image/png;base64,abc' }} updateData={jest.fn()} errors={{}} />);
    expect(screen.getByRole('img', { name: 'Logo preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
  });

  it('calls updateData with null logo when remove is clicked', async () => {
    const updateData = jest.fn();
    render(<Step3CompanyInfo data={{ logoPreview: 'data:image/png;base64,abc' }} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByRole('button', { name: '×' }));
    expect(updateData).toHaveBeenCalledWith({ logoPreview: null, logoFile: null });
  });

  it('initializes company name from data', () => {
    render(<Step3CompanyInfo data={{ companyName: 'My Co' }} updateData={jest.fn()} errors={{}} />);
    expect(screen.getByLabelText('Company Name')).toHaveValue('My Co');
  });
});
