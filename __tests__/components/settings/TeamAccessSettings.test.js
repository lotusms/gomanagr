/**
 * Unit tests for TeamAccessSettings: loading state, sections, save, industry terms
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamAccessSettings from '@/components/settings/TeamAccessSettings';

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1' } }),
}));

const mockGetTeamMemberSectionLabels = jest.fn();
const mockGetSectionDisplayLabels = jest.fn();
jest.mock('@/config/teamMemberAccess', () => ({
  TEAM_MEMBER_SECTION_KEYS: ['schedule', 'clients'],
  getTeamMemberSectionLabels: (...args) => mockGetTeamMemberSectionLabels(...args),
  getSectionDisplayLabels: (...args) => mockGetSectionDisplayLabels(...args),
  DEFAULT_TEAM_MEMBER_SECTIONS: { schedule: true, clients: false },
}));

const mockGetTermForIndustry = jest.fn();
jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (...args) => mockGetTermForIndustry(...args),
}));

const mockGetUserAccount = jest.fn();
const mockGetUserOrganization = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
}));
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('@/components/ui/Switch', () => function MockSwitch({ id, checked, onCheckedChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} data-testid={id}>
      {checked ? 'on' : 'off'}
    </button>
  );
});

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, type, disabled, onClick }) => (
    <button type={type} onClick={onClick} disabled={disabled} data-testid="primary-btn">{children}</button>
  ),
}));

describe('TeamAccessSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTeamMemberSectionLabels.mockReturnValue({ schedule: 'Schedule', clients: 'Clients' });
    mockGetSectionDisplayLabels.mockReturnValue({ schedule: 'Schedule', clients: 'Clients' });
    mockGetTermForIndustry.mockImplementation((_, key) => (key === 'team' ? 'Team' : 'Team members'));
    mockGetUserAccount.mockResolvedValue({});
    mockGetUserOrganization.mockResolvedValue(null);
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-org-member-access')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teamMemberSections: { schedule: true, clients: true } }),
        });
      }
      if (url?.includes?.('update-org-member-access')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('shows loading state then team access form', async () => {
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Team access/i })).toBeInTheDocument());
    expect(screen.getByText(/Choose which sections/)).toBeInTheDocument();
    expect(screen.getByTestId('team-access-schedule')).toBeInTheDocument();
    expect(screen.getByTestId('team-access-clients')).toBeInTheDocument();
  });

  it('saves and shows success on submit', async () => {
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByTestId('primary-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('primary-btn'));
    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/update-org-member-access',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
  });

  it('renders with industry prop', async () => {
    render(<TeamAccessSettings industry="healthcare" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Team access/i })).toBeInTheDocument());
    expect(mockGetTermForIndustry).toHaveBeenCalledWith('healthcare', expect.any(String));
  });

  it('merges loaded teamMemberSections from API into state', async () => {
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByTestId('team-access-clients')).toBeInTheDocument());
    const clientsSwitch = screen.getByTestId('team-access-clients');
    expect(clientsSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('sets industry from org then account when no industry prop', async () => {
    mockGetUserOrganization.mockResolvedValueOnce({ industry: 'healthcare' });
    render(<TeamAccessSettings />);
    await waitFor(() => expect(mockGetTermForIndustry).toHaveBeenCalledWith('healthcare', 'team'));
    expect(mockGetTermForIndustry).toHaveBeenCalledWith('healthcare', 'teamMember');
  });

  it('toggling a switch calls setSection and clears success', async () => {
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByTestId('primary-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('primary-btn'));
    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('team-access-schedule'));
    await waitFor(() => expect(screen.queryByText(/Saved\./)).not.toBeInTheDocument());
  });

  it('shows error when save returns !res.ok', async () => {
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-org-member-access')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teamMemberSections: {} }),
        });
      }
      if (url?.includes?.('update-org-member-access')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Forbidden' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByTestId('primary-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('primary-btn'));
    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument());
  });

  it('shows error when save fetch rejects', async () => {
    global.fetch = jest.fn((url) => {
      if (url?.includes?.('get-org-member-access')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teamMemberSections: {} }),
        });
      }
      if (url?.includes?.('update-org-member-access')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByTestId('primary-btn')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('primary-btn'));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('uses fallback section label when getTeamMemberSectionLabels omits key', async () => {
    mockGetTeamMemberSectionLabels.mockReturnValue({ schedule: 'View schedule' });
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByTestId('team-access-clients')).toBeInTheDocument());
    expect(screen.getByText(/Allow team members to access clients/)).toBeInTheDocument();
  });

  it('shows error when load fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<TeamAccessSettings />);
    await waitFor(() => expect(screen.getByText('Failed to load team access settings')).toBeInTheDocument());
  });
});
