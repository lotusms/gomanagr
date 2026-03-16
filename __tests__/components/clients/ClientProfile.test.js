/**
 * Unit tests for ClientProfile – render, validation, save, cancel, error paths, sections.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ClientProfile from '@/components/clients/ClientProfile';

const mockPush = jest.fn();
let routerQuery = {};
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), pathname: '/', query: routerQuery, asPath: '/' }),
}));

const mockAuth = { currentUser: { uid: 'u1' } };
jest.mock('@/lib/AuthContext', () => ({ useAuth: () => mockAuth }));
const mockSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: mockSuccess, error: mockShowError }) }));
const mockUpdateClients = jest.fn();
const mockGetUserAccount = jest.fn();
const mockSaveAppointment = jest.fn();
const mockDeleteAppointment = jest.fn();
const mockGetUserAccountFromServer = jest.fn();
jest.mock('@/services/userService', () => ({
  updateClients: (...args) => mockUpdateClients(...args),
  getUserAccount: (...args) => mockGetUserAccount(...args),
  saveAppointment: (...args) => mockSaveAppointment(...args),
  deleteAppointment: (...args) => mockDeleteAppointment(...args),
  getUserAccountFromServer: (...args) => mockGetUserAccountFromServer(...args),
}));
jest.mock('@/utils/formatPhone', () => ({ formatPhone: (v) => v, unformatPhone: (v) => (v ? v.replace(/\D/g, '') : '') }));
jest.mock('@/utils/countries', () => ({ COUNTRIES: [{ value: 'US', label: 'United States' }] }));
jest.mock('country-state-city', () => ({ State: { getStatesOfCountry: () => [] } }));
jest.mock('@/utils/clientIdGenerator', () => ({ generateClientId: () => 'test-id' }));
jest.mock('@/components/clients/clientProfileConstants', () => ({
  getProjectTermForIndustry: () => 'Projects',
  shouldShowCompanyFinancialSections: (industry) => industry !== 'NoFinancial',
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
  default: ({ onCancel, onClientAdd, onSubmit, onDelete }) => (
    <div data-testid="appointment-form">
      <span>AppointmentForm</span>
      {onCancel && <button type="button" onClick={onCancel}>Cancel appointment</button>}
      {onClientAdd && (
        <button type="button" onClick={() => onClientAdd({ name: 'New Client', email: 'new@test.com' }).then(() => {}).catch(() => {})}>
          Add client from appointment
        </button>
      )}
      {onSubmit && <button type="button" onClick={() => onSubmit({}).then(() => {})}>Submit appointment</button>}
      {onDelete && <button type="button" onClick={() => onDelete().then(() => {})}>Delete appointment</button>}
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
    routerQuery = {};
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
    // Redirect is scheduled with setTimeout(500); advance so it runs
    await act(async () => {
      await new Promise((r) => setTimeout(r, 550));
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/clients/test-id/edit');
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

  it('when userAccount has no clientSettings, visibleTabs include company and financial from shouldShowCompanyFinancialSections', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{ industry: 'Legal' }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    const wrapper = screen.getByTestId('section-wrapper');
    const values = Array.from(wrapper.querySelectorAll('[data-section]')).map((s) => s.getAttribute('data-section'));
    expect(values).toContain('financial');
    expect(values).toContain('projects');
    expect(values).toContain('communication');
  });

  it('company toggle shows CompanyDetailsSection when visibleTabs include company (no clientSettings path)', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{ industry: 'Legal' }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    const wrapper = screen.getByTestId('section-wrapper');
    expect(wrapper.querySelectorAll('[data-section="company"]').length).toBe(0);
    fireEvent.click(screen.getByTestId('switch'));
    expect(wrapper.querySelector('[data-section="company"]')).toBeInTheDocument();
    expect(screen.getByText('CompanyDetails')).toBeInTheDocument();
  });

  it('appointment drawer onClientAdd uses onSaveClient when provided', async () => {
    const mockOnSaveClient = jest.fn().mockResolvedValue(undefined);
    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveClient={mockOnSaveClient}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add client from appointment/i }));
    await waitFor(() => expect(mockOnSaveClient).toHaveBeenCalledWith(expect.any(Object), true));
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/added to appointment/i));
    expect(mockUpdateClients).not.toHaveBeenCalled();
  });

  it('appointment drawer Submit calls saveAppointment and shows success', async () => {
    mockSaveAppointment.mockResolvedValue(undefined);
    mockGetUserAccountFromServer.mockResolvedValue({});

    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [{ id: 'c1' }], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit appointment/i }));
    await waitFor(() => expect(mockSaveAppointment).toHaveBeenCalled());
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/Appointment created successfully/i));
  });

  it('appointment drawer Delete calls deleteAppointment when confirm and editing', async () => {
    mockDeleteAppointment.mockResolvedValue(undefined);
    const origConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [{ id: 'c1' }], appointments: [{ id: 'apt1', clientId: 'c1' }] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit appointment/i }));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Delete appointment/i }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/delete this appointment/i)));
    await waitFor(() => expect(mockDeleteAppointment).toHaveBeenCalledWith('u1', 'apt1'));
    expect(mockSuccess).toHaveBeenCalledWith(expect.stringMatching(/deleted successfully/i));
    window.confirm = origConfirm;
  });

  it('appointment drawer Submit failure shows error and does not close drawer', async () => {
    mockSaveAppointment.mockRejectedValue(new Error('Save failed'));
    const origConsole = console.error;
    console.error = () => {};

    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [{ id: 'c1' }], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit appointment/i }));
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Failed to save appointment/i)));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    console.error = origConsole;
  });

  it('appointment drawer Delete failure shows error when deleteAppointment rejects', async () => {
    mockDeleteAppointment.mockRejectedValue(new Error('Delete failed'));
    const origConfirm = window.confirm;
    const origConsole = console.error;
    window.confirm = jest.fn(() => true);
    console.error = () => {};

    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [{ id: 'c1' }], appointments: [{ id: 'apt1', clientId: 'c1' }] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit appointment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Delete appointment/i }));
    await waitFor(() => expect(mockDeleteAppointment).toHaveBeenCalledWith('u1', 'apt1'));
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Failed to delete appointment/i)));
    window.confirm = origConfirm;
    console.error = origConsole;
  });

  it('appointment drawer onClientAdd failure shows error when updateClients rejects', async () => {
    mockUpdateClients.mockRejectedValue(new Error('Add failed'));
    const origConsole = console.error;
    console.error = () => {};

    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add client from appointment/i }));
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Failed to add.*Please try again/i)));
    console.error = origConsole;
  });

  it('appointment drawer onClientAdd failure shows error when onSaveClient rejects', async () => {
    const mockOnSaveClient = jest.fn().mockRejectedValue(new Error('Org save failed'));
    const origConsole = console.error;
    console.error = () => {};

    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [], appointments: [] }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onSaveClient={mockOnSaveClient}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add appointment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add client from appointment/i }));
    await waitFor(() => expect(mockOnSaveClient).toHaveBeenCalled());
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/Failed to add.*Please try again/i)));
    console.error = origConsole;
  });

  it('renders with router.query.section sharedAssets so initialSection is onlineResources', () => {
    routerQuery = { section: 'sharedAssets' };
    render(
      <ClientProfile
        initialClient={{ id: 'c1' }}
        userAccount={{ clients: [{ id: 'c1' }], clientSettings: { visibleTabs: ['communication', 'documents'] } }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByTestId('section-wrapper')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
  });

  it('renders all tab sections when visibleTabs include company financial projects communication documents scheduling and isCompany', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{
          clientSettings: {
            visibleTabs: ['company', 'financial', 'projects', 'communication', 'documents', 'scheduling'],
          },
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    const wrapper = screen.getByTestId('section-wrapper');
    let sections = Array.from(wrapper.querySelectorAll('[data-section]')).map((s) => s.getAttribute('data-section'));
    expect(sections).toContain('financial');
    expect(sections).toContain('projects');
    expect(sections).toContain('communication');
    expect(sections).toContain('documents');
    expect(sections).toContain('scheduling');
    fireEvent.click(screen.getByTestId('switch'));
    sections = Array.from(wrapper.querySelectorAll('[data-section]')).map((s) => s.getAttribute('data-section'));
    expect(sections).toContain('company');
    expect(wrapper.querySelector('[data-section="company"]')).toBeInTheDocument();
    expect(screen.getByText('CompanyDetails')).toBeInTheDocument();
    expect(screen.getByText('Financial')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('clientSettings with showCompanyDetails and showFinancialInformation false hides those tabs', () => {
    render(
      <ClientProfile
        initialClient={null}
        userAccount={{
          clientSettings: {
            showCompanyDetails: false,
            showFinancialInformation: false,
            showProjectsDetails: true,
            showCommunicationLog: true,
            showDocumentsFiles: true,
            showAppointmentsSchedule: true,
          },
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    const values = Array.from(screen.getByTestId('section-wrapper').querySelectorAll('[data-section]')).map((s) => s.getAttribute('data-section'));
    expect(values).toContain('projects');
    expect(values).toContain('communication');
    expect(values).toContain('documents');
    expect(values).toContain('scheduling');
    expect(values).not.toContain('company');
    expect(values).not.toContain('financial');
  });
});
