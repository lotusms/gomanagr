/**
 * Unit tests for BasicInfoSection
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BasicInfoSection from '@/components/clients/add-client/BasicInfoSection';

describe('BasicInfoSection', () => {
  const defaultProps = {
    firstName: '',
    lastName: '',
    clientId: '',
    status: 'active',
    phone: '',
    email: '',
    preferredCommunication: 'email',
    errors: {},
    onFirstNameChange: jest.fn(),
    onLastNameChange: jest.fn(),
    onPhoneChange: jest.fn(),
    onEmailChange: jest.fn(),
    onStatusChange: jest.fn(),
    onPreferredCommunicationChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Basic Information heading and first/last name fields', () => {
    render(<BasicInfoSection {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Basic Information/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
  });

  it('renders client ID field and status toggle', () => {
    render(<BasicInfoSection {...defaultProps} clientId="client-1" />);
    expect(screen.getByLabelText(/Client ID/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('client-1')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Inactive' })).toBeInTheDocument();
  });

  it('uses clientTermSingular in Client ID label', () => {
    render(<BasicInfoSection {...defaultProps} clientTermSingular="Patient" />);
    expect(screen.getByLabelText(/Patient ID/i)).toBeInTheDocument();
  });

  it('renders phone, email, and preferred communication', () => {
    render(<BasicInfoSection {...defaultProps} />);
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferred Communication Method/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Phone' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'SMS' })).toBeInTheDocument();
  });

  it('calls onFirstNameChange when first name is changed', () => {
    render(<BasicInfoSection {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    expect(defaultProps.onFirstNameChange).toHaveBeenCalled();
  });

  it('calls onLastNameChange when last name is changed', () => {
    render(<BasicInfoSection {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    expect(defaultProps.onLastNameChange).toHaveBeenCalled();
  });

  it('calls onStatusChange when status is selected', () => {
    render(<BasicInfoSection {...defaultProps} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Inactive' }));
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('inactive');
  });

  it('calls onPreferredCommunicationChange when method is selected', () => {
    render(<BasicInfoSection {...defaultProps} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Phone' }));
    expect(defaultProps.onPreferredCommunicationChange).toHaveBeenCalledWith('phone');
  });

  it('displays first and last name errors when provided', () => {
    render(
      <BasicInfoSection
        {...defaultProps}
        errors={{ firstName: 'First name required', lastName: 'Last name required' }}
      />
    );
    expect(screen.getByText('First name required')).toBeInTheDocument();
    expect(screen.getByText('Last name required')).toBeInTheDocument();
  });

  it('shows values for phone and email', () => {
    render(
      <BasicInfoSection
        {...defaultProps}
        phone="(717) 555-1234"
        email="jane@example.com"
      />
    );
    expect(screen.getByDisplayValue('(717) 555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });
});
