/**
 * Unit tests for the Services page:
 * - Service cards (name, description clipped, assigned members or "No team members assigned")
 * - Pagination
 * - Add Service button opens drawer; Add service drawer same as team member drawer (name, description, assign members)
 * - Edit pencil opens drawer with service pre-populated
 * - Delete removes service and assignment from team members
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import ServicesPage from '@/pages/dashboard/services';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/services',
    query: {},
    asPath: '/dashboard/services',
  }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'owner@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockUpdateServices = jest.fn();
const mockUpdateTeamMembers = jest.fn();
const mockGetOrgServices = jest.fn();
const mockUpdateOrgServices = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateServices: (...args) => mockUpdateServices(...args),
  updateTeamMembers: (...args) => mockUpdateTeamMembers(...args),
  getOrgServices: (...args) => mockGetOrgServices(...args),
  updateOrgServices: (...args) => mockUpdateOrgServices(...args),
}));

const mockGetUserOrganization = jest.fn();
jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

const teamMembers = [
  { id: 'tm1', name: 'Alice', email: 'alice@example.com' },
  { id: 'tm2', name: 'Bob', email: 'bob@example.com' },
];

const defaultServices = [
  {
    id: 'svc-1',
    name: 'Haircut',
    description: 'Full haircut and styling.',
    assignedTeamMemberIds: ['tm1'],
  },
  {
    id: 'svc-2',
    name: 'Consultation',
    description: '30-minute consultation. Discuss goals and options.',
    assignedTeamMemberIds: [],
  },
  {
    id: 'svc-3',
    name: 'Coloring',
    description: 'Full color service.',
    assignedTeamMemberIds: ['tm1', 'tm2'],
  },
];

function mockUserAccount(overrides = {}) {
  return {
    teamMembers,
    services: defaultServices,
    firstName: 'Owner',
    ...overrides,
  };
}

describe('Services page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserOrganization.mockResolvedValue({
      id: 'org-1',
      membership: { role: 'superadmin' },
    });
    mockGetUserAccount.mockResolvedValue(mockUserAccount());
    mockUpdateServices.mockResolvedValue(undefined);
    mockUpdateTeamMembers.mockResolvedValue(undefined);
  });

  describe('Loading skeleton', () => {
    it('shows skeleton while loading, then content when loaded', async () => {
      let resolveAccount;
      mockGetUserAccount.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAccount = () => resolve(mockUserAccount());
          })
      );

      render(<ServicesPage />);

      expect(screen.getByTestId('services-page-skeleton')).toBeInTheDocument();

      resolveAccount();

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('services-page-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('service cards', () => {
    it('shows service cards with name, description, and assigned members or "No team members assigned"', async () => {
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      expect(screen.getByText('Haircut')).toBeInTheDocument();
      expect(screen.getByText('Consultation')).toBeInTheDocument();
      expect(screen.getByText('Coloring')).toBeInTheDocument();

      expect(screen.getByText('Full haircut and styling.')).toBeInTheDocument();
      expect(screen.getByText(/30-minute consultation/)).toBeInTheDocument();
      expect(screen.getByText('Full color service.')).toBeInTheDocument();

      expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/No team members assigned/i)).toBeInTheDocument();

      expect(screen.getByText(/Assigned to 1 member/)).toBeInTheDocument();
      expect(screen.getByText(/Assigned to 2 members/)).toBeInTheDocument();
    });

    it('description is present and can be long (clipped in UI via line-clamp)', async () => {
      const longDesc = 'A'.repeat(200);
      mockGetUserAccount.mockResolvedValue(
        mockUserAccount({
          services: [{ id: 's1', name: 'Long', description: longDesc, assignedTeamMemberIds: [] }],
        })
      );
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByText('Long')).toBeInTheDocument();
      });
      expect(screen.getByText(longDesc)).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('paginates services and shows pagination controls when more than one page', async () => {
      const manyServices = Array.from({ length: 15 }, (_, i) => ({
        id: `svc-${i}`,
        name: `Service ${i + 1}`,
        description: `Desc ${i}`,
        assignedTeamMemberIds: [],
      }));
      mockGetUserAccount.mockResolvedValue(
        mockUserAccount({ services: manyServices })
      );
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByText('Service 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Service 1')).toBeInTheDocument();
      expect(screen.getByText('Service 12')).toBeInTheDocument();
      expect(screen.queryByText('Service 13')).not.toBeInTheDocument();

      const itemsPerPageSelect = screen.getByLabelText(/items per page/i);
      expect(itemsPerPageSelect).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /next page/i });
      expect(nextBtn).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(nextBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Service 13')).toBeInTheDocument();
      });
      expect(screen.queryByText('Service 1')).not.toBeInTheDocument();
    });

    it('items per page selector changes how many cards are shown', async () => {
      const manyServices = Array.from({ length: 10 }, (_, i) => ({
        id: `svc-${i}`,
        name: `Service ${i + 1}`,
        assignedTeamMemberIds: [],
      }));
      mockGetUserAccount.mockResolvedValue(
        mockUserAccount({ services: manyServices })
      );
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/items per page/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/items per page/i);
      fireEvent.change(select, { target: { value: '6' } });

      await waitFor(() => {
        expect(screen.getByText('Service 1')).toBeInTheDocument();
        expect(screen.getByText('Service 6')).toBeInTheDocument();
      });
      expect(screen.queryByText('Service 7')).not.toBeInTheDocument();
    });
  });

  describe('Add Service button and drawer', () => {
    it('Add service button opens drawer with Add Service title and form (name, description, assign members)', async () => {
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add service/i }).click();
      });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: /add service/i })).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByLabelText(/service name/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/description/i)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /add service/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('Add service drawer works like team member drawer: submit creates service with name, description, assigned members', async () => {
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add service/i }).click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText(/service name/i), {
        target: { value: 'New Service' },
      });
      fireEvent.change(within(dialog).getByLabelText(/description/i), {
        target: { value: 'New description.' },
      });
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: /alice/i }));
      });
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: /add service/i }));
      });

      await waitFor(() => {
        expect(mockUpdateServices).toHaveBeenCalledWith(
          'user-1',
          expect.arrayContaining([
            expect.objectContaining({
              name: 'New Service',
              description: 'New description.',
              assignedTeamMemberIds: expect.arrayContaining(['tm1']),
            }),
          ])
        );
      });
    });
  });

  describe('Edit service', () => {
    it('Edit (pencil) icon opens drawer with service info pre-populated', async () => {
      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit service/i });
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
      await act(async () => {
        editButtons[0].click();
      });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: /edit service/i })).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByLabelText(/service name/i)).toHaveValue('Haircut');
      expect(within(dialog).getByLabelText(/description/i)).toHaveValue('Full haircut and styling.');
      expect(within(dialog).getByRole('button', { name: /update service/i })).toBeInTheDocument();
    });
  });

  describe('Delete service', () => {
    it('Delete icon opens confirmation dialog; confirming deletes service and removes assignment from team members', async () => {
      const accountWithLegacyServices = mockUserAccount();
      accountWithLegacyServices.teamMembers = [
        { id: 'tm1', name: 'Alice', email: 'a@b.com', services: ['Haircut', 'Coloring'] },
        { id: 'tm2', name: 'Bob', email: 'b@b.com', services: ['Coloring'] },
      ];
      mockGetUserAccount.mockResolvedValue(accountWithLegacyServices);

      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete service/i });
      await act(async () => {
        deleteButtons[0].click();
      });

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: /delete service/i })).toBeInTheDocument();
        expect(within(dialog).getByText(/are you sure you want to delete "haircut"/i)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const confirmInput = within(dialog).getByLabelText(/type "delete" to confirm/i);
      fireEvent.change(confirmInput, { target: { value: 'delete' } });

      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));
      });

      await waitFor(() => {
        expect(mockUpdateServices).toHaveBeenCalledWith(
          'user-1',
          expect.arrayContaining([
            expect.objectContaining({ name: 'Consultation' }),
            expect.objectContaining({ name: 'Coloring' }),
          ])
        );
        const updatedServices = mockUpdateServices.mock.calls[0][1];
        expect(updatedServices).toHaveLength(2);
        expect(updatedServices.find((s) => s.name === 'Haircut')).toBeUndefined();
      });

      expect(mockUpdateTeamMembers).toHaveBeenCalledWith(
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'tm1',
            services: ['Coloring'],
          }),
          expect.objectContaining({
            id: 'tm2',
            services: ['Coloring'],
          }),
        ])
      );
    });
  });

  describe('empty state', () => {
    it('shows empty state and "Add your first service" when no services', async () => {
      mockGetUserAccount.mockResolvedValue(mockUserAccount({ services: [] }));

      render(<ServicesPage />);

      await waitFor(() => {
        expect(screen.getByText(/add your first service/i)).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByRole('button', { name: /add your first service/i }).click();
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByRole('heading', { name: /add service/i })).toBeInTheDocument();
      });
    });
  });
});
