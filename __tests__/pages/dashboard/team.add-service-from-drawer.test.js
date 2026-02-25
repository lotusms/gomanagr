/**
 * Unit tests: creating a service (name, description, members assigned) from the
 * add/edit team member drawer, and ensuring it is persisted so it appears on the services page.
 */

import React from 'react';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import TeamPage from '@/pages/dashboard/team';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/team',
    query: {},
    asPath: '/dashboard/team',
  }),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn(), warning: jest.fn() }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'owner-uid', email: 'owner@example.com' },
  }),
}));

const mockGetUserAccount = jest.fn();
const mockUpdateTeamMembers = jest.fn();
const mockUpdateServices = jest.fn();
jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
  updateTeamMembers: (...args) => mockUpdateTeamMembers(...args),
  updateServices: (...args) => mockUpdateServices(...args),
  uploadTeamPhoto: jest.fn(),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: jest.fn().mockResolvedValue({
    id: 'org-1',
    membership: { role: 'admin' },
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      send: jest.fn(),
      unsubscribe: () => {},
    }),
  },
}));

const teamMembers = [
  { id: 'tm1', name: 'Alice', email: 'alice@example.com' },
  { id: 'tm2', name: 'Bob', email: 'bob@example.com' },
];

describe('Team page – Add service from add/edit team member drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    mockGetUserAccount.mockResolvedValue({
      teamMembers,
      services: [],
      firstName: 'Owner',
    });
    mockUpdateTeamMembers.mockResolvedValue(undefined);
    mockUpdateServices.mockResolvedValue(undefined);

    global.fetch = jest.fn((url) => {
      const path = typeof url === 'string' ? url : url?.url ?? '';
      if (path.includes('get-org-members')) {
        return Promise.resolve({ json: () => Promise.resolve({ members: [] }) });
      }
      if (path.includes('get-org-invites')) {
        return Promise.resolve({ json: () => Promise.resolve({ invites: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('creates a service with name, description, and assigned members from the drawer and persists it (available on services page)', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
    });

    // Open Add team member drawer
    await act(async () => {
      screen.getByRole('button', { name: /add member/i }).click();
    });

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: /add team member/i })).toBeInTheDocument();
    });

    const addMemberDrawer = screen.getByRole('dialog');

    // Open Add Service drawer from "Services offered" section
    const addServiceBtn = within(addMemberDrawer).getByTestId('add-service-from-drawer');
    await act(async () => {
      addServiceBtn.click();
    });

    // Second dialog is the Add Service drawer
    await waitFor(() => {
      const dialogs = screen.getAllByRole('dialog');
      const addServiceDialog = dialogs.find(
        (d) => within(d).queryByLabelText(/service name/i) != null
      );
      expect(addServiceDialog).toBeDefined();
    });

    const addServiceDialog = screen.getAllByRole('dialog').find(
      (d) => within(d).queryByLabelText(/service name/i) != null
    );

    // Fill service name and description
    const nameInput = within(addServiceDialog).getByLabelText(/service name/i);
    const descriptionInput = within(addServiceDialog).getByLabelText(/description/i);

    fireEvent.change(nameInput, { target: { value: 'Haircut & Style' } });
    fireEvent.change(descriptionInput, { target: { value: 'Full haircut and styling session.' } });

    // Assign to one team member (ChipsMulti shows member names as toggle buttons)
    const aliceOption = within(addServiceDialog).getByRole('button', { name: /alice/i });
    await act(async () => {
      fireEvent.click(aliceOption);
    });

    // Submit Add Service form
    const addServiceSubmitBtn = within(addServiceDialog).getByRole('button', {
      name: /add service/i,
    });
    await act(async () => {
      fireEvent.click(addServiceSubmitBtn);
    });

    // Team page calls updateServices with the new services array (persisted; services page reads same source)
    await waitFor(() => {
      expect(mockUpdateServices).toHaveBeenCalledWith(
        'owner-uid',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Haircut & Style',
            description: 'Full haircut and styling session.',
            assignedTeamMemberIds: expect.arrayContaining(['tm1']),
          }),
        ])
      );
    });

    const savedServices = mockUpdateServices.mock.calls[0][1];
    const newService = savedServices.find((s) => s.name === 'Haircut & Style');
    expect(newService).toBeDefined();
    expect(newService.description).toBe('Full haircut and styling session.');
    expect(newService.assignedTeamMemberIds).toContain('tm1');
    expect(newService.id).toBeDefined();
    expect(typeof newService.id).toBe('string');
  });

  it('new service created from drawer is in the shape expected by the services page', async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByRole('button', { name: /add member/i }).click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const addMemberDrawer = screen.getByRole('dialog');
    await act(async () => {
      within(addMemberDrawer).getByTestId('add-service-from-drawer').click();
    });

    await waitFor(() => {
      const addServiceDialog = screen.getAllByRole('dialog').find(
        (d) => within(d).queryByLabelText(/service name/i) != null
      );
      expect(addServiceDialog).toBeDefined();
    });

    const addServiceDialog = screen.getAllByRole('dialog').find(
      (d) => within(d).queryByLabelText(/service name/i) != null
    );

    fireEvent.change(within(addServiceDialog).getByLabelText(/service name/i), {
      target: { value: 'Consultation' },
    });
    fireEvent.change(within(addServiceDialog).getByLabelText(/description/i), {
      target: { value: '30 min consult.' },
    });
    await act(async () => {
      fireEvent.click(within(addServiceDialog).getByRole('button', { name: /add service/i }));
    });

    await waitFor(() => {
      expect(mockUpdateServices).toHaveBeenCalled();
    });

    const updatedServices = mockUpdateServices.mock.calls[0][1];
    expect(updatedServices).toHaveLength(1);
    const svc = updatedServices[0];
    // Services page expects: id, name, description?, assignedTeamMemberIds?
    expect(svc).toMatchObject({
      id: expect.any(String),
      name: 'Consultation',
      description: '30 min consult.',
    });
    expect(Array.isArray(svc.assignedTeamMemberIds)).toBe(true);
  });
});
