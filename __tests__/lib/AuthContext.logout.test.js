import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args) => mockSignOut(...args),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

function LogoutTrigger() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={() => logout()}>
      Logout
    </button>
  );
}

/** Mimics app flow: logout then redirect to "/" (e.g. DashboardLayout handleLogout). */
function LogoutWithRedirect() {
  const { logout } = useAuth();
  const router = require('next/router').useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <button type="button" onClick={handleLogout}>
      Logout
    </button>
  );
}

describe('AuthContext logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls supabase.auth.signOut when logout is invoked', async () => {
    render(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('redirects to "/" when user clicks logout (logout then router.push)', async () => {
    render(
      <AuthProvider>
        <LogoutWithRedirect />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('resets theme to default (removes dark class) when user logs out', async () => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.add('dark');

    render(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    document.documentElement.classList.remove('dark');
  });

  it('resets palette when user logs out (removes data-palette and clears cookie)', async () => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-palette', 'palette2');
    document.cookie = 'gomanagr_palette=palette2;path=/;max-age=31536000;SameSite=Lax';

    render(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    });

    expect(document.documentElement.getAttribute('data-palette')).toBeNull();
    expect(document.cookie).not.toMatch(/gomanagr_palette=palette2/);
  });
});
