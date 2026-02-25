import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserAccountProvider } from '@/lib/UserAccountContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/account', replace: jest.fn(), push: jest.fn() }),
}));

const mockLogout = jest.fn();
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', email: 'jane@example.com' },
    logout: mockLogout,
  }),
}));

const initialAccount = {
  firstName: 'Jane',
  lastName: 'Doe',
  nameView: 'full',
};
jest.mock('@/services/userService', () => ({
  getUserAccount: () => Promise.resolve({ ...initialAccount }),
}));

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: () =>
    Promise.resolve({ membership: { role: 'admin' }, logo_url: null }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      unsubscribe: () => {},
    }),
  },
}));

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));

describe('DashboardLayout header updates after Save Profile (name view)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates greeting when useraccount-updated is dispatched with new nameView', async () => {
    render(
      <UserAccountProvider>
        <DashboardLayout>
          <div data-testid="content">Page content</div>
        </DashboardLayout>
      </UserAccountProvider>
    );

    // Wait for account/org to load so greeting shows initial display name (full = "Jane Doe")
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    const greetingDiv = screen.getByText(/Hello,/).closest('div');
    expect(greetingDiv?.textContent).toMatch(/Hello,\s*Jane Doe/);

    // Simulate Save Profile: account page dispatches useraccount-updated with saved payload
    const updatedPayload = {
      ...initialAccount,
      nameView: 'first',
    };
    await act(() => {
      window.dispatchEvent(
        new CustomEvent('useraccount-updated', { detail: updatedPayload })
      );
    });

    // After update, nameView is 'first' so display name is first name only; greeting updates seamlessly
    await waitFor(() => {
      expect(greetingDiv?.textContent).toMatch(/Hello,\s*Jane\b/);
      expect(greetingDiv?.textContent).not.toMatch(/Jane Doe/);
    });
  });
});
