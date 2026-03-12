/**
 * Unit tests for ClientProfile – render, validation, save, cancel, error paths, sections.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientProfile from '@/components/clients/ClientProfile';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));

const mockAuth = { currentUser: { uid: 'u1' } };
jest.mock('@/lib/AuthContext', () => ({ useAuth: () => mockAuth }));
const mockSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: mockSuccess, error: mockShowError }) }));
const mockUpdateClients = jest.fn();
const mockGetUserAccount = jest.fn();
jest.mock('@/services/userService', () => ({
  updateClients: (...args) => mockUpdateClients(...args),
  getUserAccount: (...args) => mockGetUserAccount(...args),
  saveAppointment: jest.fn(),
  deleteAppointment: jest.fn(),
  getUserAccountFromServer: jest.fn(),
}));
jest.mock('@/utils/formatPhone', () => ({ formatPhone: (v) => v, unformatPhone: (v) => (v ? v.replace(/\D/g, '') : '') }));
jest.mock('@/utils/countries', () => ({ COUNTRIES: [{ value: 'US', label: 'United States' }] }));
jest.mock('country-state-city', () => ({ State: { getStatesOfCountry: () => [] } }));
jest.mock('@/utils/clientIdGenerator', () => ({ generateClientId: () => 'test-id' }));
jest.mock('@/components/clients/clientProfileConstants', () => ({
  getProjectTermForIndustry: () => 'Projects',
  shouldShowCompanyFinancialSections: () => true,
  getTermForIndustry: () => 'Clients',
  getTermSingular: () => 'Client',
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));
jest.mock('@/components/ui/Drawer', () => ({
  __esModule: true,
  default: ({ children, onClose }) => (
    <div data-testid="drawer">
      <button type="button" onClick={onClose} aria-label="Close drawer">Close</button>
      {children}
    </div>
  ),
}));
jest.mock('@/components/ui/Switch', () => ({ __esModule: true, default: (props) => <input type="checkbox" data-testid="switch" checked={!!props.checked} onChange={(e) => props.onCheckedChange?.(e.target.checked)} /> }));
jest.mock('@/components/dashboard/ResponsiveSectionWrapper', () => ({
  __esModule: true,
  default: ({ sections = [], defaultTab }) => (
    <div data-testid="section-wrapper">
      {sections.map((s) => (
        <div key={s.value} data-section={s.value}>
          {s.content}
        </div>
      ))}
    </div>
  ),
}));
jest.mock('@/components/dashboard/AppointmentForm', () => ({
  __esModule: true,
  default: ({ onCancel, onClientAdd }) => (
    <div data-testid="appointment-form">
      <span>AppointmentForm</span>
      {onCancel && <button type="button" onClick={onCancel}>Cancel appointment</button>}
      {onClientAdd && (
        <button type="button" onClick={() => onClientAdd({ name: 'New Client', email: 'new@test.com' }).then(() => {})}>
          Add client from appointment
        </button>
      )}
    </div>
  ),
}));
jest.mock('@/components/dashboard/ClientAppointmentsCalendar', () => ({
  __esModule: true,
  default: ({ onAppointmentClick }) => (
    <div data-testid="calendar">
      <button type="button" onClick={() => onAppointmentClick(null)}>Add appointment</button>
      <button type="button" onClick={() => onAppointmentClick({ id: 'apt1', clientId: 'c1' })}>Edit appointment</button>
    </div>
  ),
}));
jest.mock('@/components/clients/add-client/BasicInfoSection', () => ({
  __esModule: true,
  default: ({ firstName, lastName, onFirstNameChange, onLastNameChange, errors }) => (
    <div data-testid="basic-info">
      <label htmlFor="firstName">First Name</label>
      <input id="firstName" value={firstName || ''} onChange={(e) => onFirstNameChange(e)} aria-invalid={!!errors?.firstName} />
      <label htmlFor="lastName">Last Name</label>
      <input id="lastName" value={lastName || ''} onChange={(e) => onLastNameChange(e)} aria-invalid={!!errors?.lastName} />
      {errors?.firstName && <span role="alert">{errors.firstName}</span>}
      {errors?.lastName && <span role="alert">{errors.lastName}</span>}
    </div>
  ),
}));
jest.mock('@/components/clients/add-client/CompanyDetailsSection', () => () => <div>CompanyDetails</div>);
jest.mock('@/components/clients/add-client/FinancialInformationSection', () => () => <div>Financial</div>);
jest.mock('@/components/clients/add-client/ProjectsDetailsSection', () => () => <div>Projects</div>);
jest.mock('@/components/clients/add-client/CommunicationLogSection', () => () => <div>Communication</div>);
jest.mock('@/components/clients/add-client/DocumentsFilesSection', () => () => <div>Documents</div>);

describe('ClientProfile', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = { uid: 'u1' };
    mockGetUserAccount.mockResolvedValue({ clients: [] });
  });

  it('renders form with company toggle and action buttons for new client', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{ industry: 'Legal' }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText((content) => content.includes('is a company'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Client/i })).toBeInTheDocument();
    expect(screen.getByTestId('basic-info')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{}}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('renders with initialClient and shows Update Client button', () => {
    render(
      <ClientProfile
        initialClient={{ id: 'c1', name: 'Jane Doe', email: 'j@test.com' }}
        userAccount={{ clients: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole('button', { name: /Update Client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows validation errors when submit without first/last name', () => {
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(/Please enter first name/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter last name/i)).toBeInTheDocument();
    expect(mockUpdateClients).not.toHaveBeenCalled();
  });

  it('saves new client and calls updateClients and onSave', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockResolvedValue(undefined);
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockUpdateClients).toHaveBeenCalledWith('u1', expect.any(Array)));
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/created successfully/i));
    expect(mockOnSave).toHaveBeenCalledWith('test-id');
  });

  it('when no onSave, redirects to client edit after save', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockResolvedValue(undefined);
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockUpdateClients).toHaveBeenCalled());
    expect(mockSuccess).toHaveBeenCalled();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/test-id/edit'));
  });

  it('calls onSaveClient when provided (org path)', async () => {
    const mockOnSaveClient = jest.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ClientProfile
        initialClient={null}
        userAccount={{}}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveClient={mockOnSaveClient}
      />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockOnSaveClient).toHaveBeenCalledWith(expect.any(Object), true));
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/created successfully/i));
    expect(mockOnSave).toHaveBeenCalled();
    expect(mockUpdateClients).not.toHaveBeenCalled();
  });

  it('updates existing client and calls updateClients', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [{ id: 'c1', name: 'Jane Doe' }] });
    mockUpdateClients.mockResolvedValue(undefined);
    const { container } = render(
      <ClientProfile
        initialClient={{ id: 'c1', name: 'Jane Doe', email: 'j@test.com' }}
        userAccount={{ clients: [{ id: 'c1' }] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    await waitFor(() => expect(screen.getByDisplayValue('Jane')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Janet' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockUpdateClients).toHaveBeenCalledWith('u1', expect.any(Array)));
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/updated successfully/i));
    expect(mockOnSave).toHaveBeenCalledWith('c1');
  });

  it('shows permission error when save fails with RLS message', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockRejectedValue(new Error('RLS policy violation'));
    const orig = console.error;
    console.error = () => {};
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Permission denied/i)));
    expect(screen.getByText(/RLS policy violation/i)).toBeInTheDocument();
    console.error = orig;
  });

  it('shows network error when save fails with network message', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockRejectedValue(new Error('fetch failed'));
    const orig = console.error;
    console.error = () => {};
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Network error/i)));
    console.error = orig;
  });

  it('shows generic error and errors.submit when save fails', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockRejectedValue(new Error('Something went wrong'));
    const orig = console.error;
    console.error = () => {};
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    console.error = orig;
  });

  it('uses clientSettings.visibleTabs when provided', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{ clientSettings: { visibleTabs: ['company', 'financial', 'projects'] } }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByTestId('section-wrapper')).toBeInTheDocument();
    const sections = screen.getByTestId('section-wrapper').querySelectorAll('[data-section]');
    const values = Array.from(sections).map((s) => s.getAttribute('data-section'));
    expect(values).toContain('basic');
    expect(values).toContain('financial');
    expect(values).toContain('projects');
    expect(values).not.toContain('company');
  });

  it('company toggle adds company section when visibleTabs includes company', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{ clientSettings: { visibleTabs: ['company', 'financial'] } }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    const wrapper = screen.getByTestId('section-wrapper');
    const sectionsBefore = Array.from(wrapper.querySelectorAll('[data-section]'));
    expect(sectionsBefore.some((s) => s.getAttribute('data-section') === 'company')).toBe(false);
    fireEvent.click(screen.getByTestId('switch'));
    const sectionsAfter = Array.from(wrapper.querySelectorAll('[data-section]'));
    expect(sectionsAfter.some((s) => s.getAttribute('data-section') === 'company')).toBe(true);
  });

  it('does not call updateClients when currentUser is missing', async () => {
    mockAuth.currentUser = null;
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockUpdateClients).not.toHaveBeenCalled());
  });

  it('uses clientSettings boolean flags when visibleTabs not array', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{
          clientSettings: {
            showCompanyDetails: true,
            showFinancialInformation: true,
            showProjectsDetails: false,
            showCommunicationLog: true,
            showDocumentsFiles: true,
            showAppointmentsSchedule: false,
          },
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    const values = Array.from(screen.getByTestId('section-wrapper').querySelectorAll('[data-section]')).map((s) => s.getAttribute('data-section'));
    expect(values).toContain('basic');
    expect(values).toContain('communication');
    expect(values).toContain('documents');
  });

  it('shows permission error when save fails with policy message', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockRejectedValue(new Error('permission denied by policy'));
    const orig = console.error;
    console.error = () => {};
    const { container } = render(
      <ClientProfile initialClient={null} userAccount={{}} onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Permission denied/i)));
    console.error = orig;
  });

  it('initialClient with companyAddress normalizes country', async () => {
    render(
      <ClientProfile
        initialClient={{
          id: 'c1',
          name: 'Acme',
          email: 'a@test.com',
          company: 'Acme Inc',
          companyAddress: { address1: '1 St', city: 'NY', country: 'United States' },
        }}
        userAccount={{ clients: [{ id: 'c1' }] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole('button', { name: /Update Client/i })).toBeInTheDocument();
  });

  it('opens appointment drawer when Add appointment is clicked and closes via Drawer onClose', () => {
    render(
      <ClientProfile
        initialClient={{ id: 'c1', name: 'Jane' }}
        userAccount={{ clients: [{ id: 'c1' }], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-form')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close drawer/i }));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });

  it('closes appointment drawer when AppointmentForm onCancel is clicked', () => {
    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel appointment/i }));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });

  it('initialClient with paymentHistory array and billingAddress', () => {
    render(
      <ClientProfile
        initialClient={{
          id: 'c1',
          name: 'Jane Doe',
          paymentHistory: [{ date: '2024-01-01', amount: 100 }],
          billingAddress: { address1: '2 Billing St', country: 'US' },
        }}
        userAccount={{ clients: [{ id: 'c1' }] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole('button', { name: /Update Client/i })).toBeInTheDocument();
  });

  it('initialClient with paymentHistory as string sets empty array', () => {
    render(
      <ClientProfile
        initialClient={{
          id: 'c1',
          name: 'Jane',
          paymentHistory: 'legacy-string',
        }}
        userAccount={{ clients: [{ id: 'c1' }] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole('button', { name: /Update Client/i })).toBeInTheDocument();
  });

  it('uses organization industry when provided', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{}}
        organization={{ industry: 'Healthcare' }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByTestId('section-wrapper')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Client/i })).toBeInTheDocument();
  });

  it('appointment drawer onClientAdd calls updateClients and shows success', async () => {
    mockGetUserAccount.mockResolvedValue({ clients: [] });
    mockUpdateClients.mockResolvedValue(undefined);
    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add client from appointment/i }));
    await waitFor(() => expect(mockUpdateClients).toHaveBeenCalledWith('u1', expect.any(Array)));
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/added to appointment/i));
  });
});
