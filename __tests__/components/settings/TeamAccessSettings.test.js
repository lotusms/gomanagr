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

jest.mock('@/config/teamMemberAccess', () => ({
  TEAM_MEMBER_SECTION_KEYS: ['schedule', 'clients'],
  getTeamMemberSectionLabels: () => ({ schedule: 'Schedule', clients: 'Clients' }),
  getSectionDisplayLabels: () => ({ schedule: 'Schedule', clients: 'Clients' }),
  DEFAULT_TEAM_MEMBER_SECTIONS: { schedule: true, clients: false },
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => (key === 'team' ? 'Team' : 'Team members'),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: jest.fn(() => Promise.resolve(null)),
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
  });
});
