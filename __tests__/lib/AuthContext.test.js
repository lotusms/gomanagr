/**
 * Unit tests for AuthContext: useAuth, signup, login, resetPassword, resetPasswordWithToken, updatePassword, session init
 */
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args) => mockSignUp(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signOut: (...args) => mockSignOut(...args),
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
      updateUser: (...args) => mockUpdateUser(...args),
    },
  },
}));

const mockUnsubscribe = jest.fn();

function Consumer({ onAuth }) {
  const auth = useAuth();
  if (onAuth) onAuth(auth);
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.currentUser ? auth.currentUser.uid : 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalWindow = typeof window !== 'undefined' ? window.location.hostname : undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (typeof window !== 'undefined' && originalWindow !== undefined) {
      Object.defineProperty(window, 'location', { value: { ...window.location, hostname: originalWindow }, writable: true });
    }
  });

  describe('useAuth and provider', () => {
    it('exposes currentUser, loading, signup, login, logout, resetPassword, resetPasswordWithToken, updatePassword', async () => {
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      expect(auth).toMatchObject({
        currentUser: null,
        loading: false,
      });
      expect(typeof auth.signup).toBe('function');
      expect(typeof auth.login).toBe('function');
      expect(typeof auth.logout).toBe('function');
      expect(typeof auth.resetPassword).toBe('function');
      expect(typeof auth.resetPasswordWithToken).toBe('function');
      expect(typeof auth.updatePassword).toBe('function');
    });

    it('sets currentUser and loading from getSession on mount', async () => {
      const user = { id: 'uid-1', email: 'a@b.com' };
      mockGetSession.mockResolvedValue({ data: { session: { user } } });
      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );
      await act(async () => {});
      expect(screen.getByTestId('user')).toHaveTextContent('uid-1');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('onAuthStateChange updates currentUser and cleanup unsubscribes', async () => {
      let authStateCallback;
      mockOnAuthStateChange.mockImplementation((cb) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });
      const { unmount } = render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );
      await act(async () => {});
      expect(authStateCallback).toBeDefined();
      const user = { id: 'uid-2', email: 'c@d.com' };
      await act(async () => { authStateCallback('SIGNED_IN', { user }); });
      expect(screen.getByTestId('user')).toHaveTextContent('uid-2');
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('returns user and session on success', async () => {
      const user = { id: 'u1', email: 'x@y.com' };
      const session = { access_token: 'token123' };
      mockSignUp.mockResolvedValue({ data: { user, session }, error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      let result;
      await act(async () => {
        result = await auth.signup('x@y.com', 'pass');
      });
      expect(result).toEqual({
        user: { ...user, uid: 'u1' },
        session: { access_token: 'token123' },
      });
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'x@y.com', password: 'pass' })
      );
    });

    it('uses emailRedirectTo undefined in development', async () => {
      process.env.NODE_ENV = 'development';
      mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await act(async () => { await auth.signup('a@b.com', 'pwd'); });
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pwd',
        options: { emailRedirectTo: undefined },
      });
    });

    it('uses emailRedirectTo undefined when hostname is localhost', async () => {
      process.env.NODE_ENV = 'production';
      Object.defineProperty(window, 'location', { value: { ...window.location, hostname: 'localhost' }, writable: true });
      mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await act(async () => { await auth.signup('a@b.com', 'pwd'); });
      expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: undefined } }));
    });

    it('throws development message on rate limit in development', async () => {
      process.env.NODE_ENV = 'development';
      mockSignUp.mockResolvedValue({ data: null, error: { message: 'Rate limit exceeded' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.signup('a@b.com', 'pwd'))).rejects.toThrow('Rate limit exceeded (Development Mode)');
    });

    it('throws production message on rate limit in production', async () => {
      process.env.NODE_ENV = 'production';
      Object.defineProperty(window, 'location', { value: { ...window.location, hostname: 'example.com' }, writable: true });
      mockSignUp.mockResolvedValue({ data: null, error: { message: 'Too many requests' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.signup('a@b.com', 'pwd'))).rejects.toThrow('Rate limit exceeded. This usually happens when');
    });

    it('throws on rate limit when error.status is 429', async () => {
      process.env.NODE_ENV = 'production';
      Object.defineProperty(window, 'location', { value: { ...window.location, hostname: 'example.com' }, writable: true });
      mockSignUp.mockResolvedValue({ data: null, error: { status: 429, message: 'Other' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.signup('a@b.com', 'pwd'))).rejects.toThrow('Rate limit exceeded');
    });

    it('throws friendly message when email already registered', async () => {
      mockSignUp.mockResolvedValue({ data: null, error: { message: 'User already exists' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.signup('a@b.com', 'pwd'))).rejects.toThrow('This email is already registered');
    });

    it('throws error.message for other signup errors', async () => {
      mockSignUp.mockResolvedValue({ data: null, error: { message: 'Invalid email format' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.signup('bad', 'pwd'))).rejects.toThrow('Invalid email format');
    });

    it('returns session null when no session in data', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      let result;
      await act(async () => { result = await auth.signup('a@b.com', 'pwd'); });
      expect(result.session).toBeNull();
    });
  });

  describe('login', () => {
    it('returns user on success', async () => {
      const user = { id: 'u1', email: 'a@b.com' };
      mockSignInWithPassword.mockResolvedValue({ data: { user }, error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      let result;
      await act(async () => { result = await auth.login('a@b.com', 'pwd'); });
      expect(result).toEqual({ user: { ...user, uid: 'u1' } });
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pwd' });
    });

    it('throws on error', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.login('a@b.com', 'wrong'))).rejects.toThrow('Invalid login');
    });
  });

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail with redirectTo and does not throw on success', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await act(async () => { await auth.resetPassword('a@b.com'); });
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
      );
    });

    it('throws on error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.resetPassword('nope@b.com'))).rejects.toThrow('User not found');
    });
  });

  describe('resetPasswordWithToken', () => {
    it('calls updateUser with password and does not throw on success', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await act(async () => { await auth.resetPasswordWithToken('newPwd'); });
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPwd' });
    });

    it('throws on error', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Token expired' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.resetPasswordWithToken('new'))).rejects.toThrow('Token expired');
    });
  });

  describe('updatePassword', () => {
    it('rejects when not signed in', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.updatePassword('old', 'new'))).rejects.toThrow('Not signed in');
    });

    it('throws when current password is incorrect', async () => {
      const user = { id: 'u1', email: 'u@b.com' };
      mockGetSession.mockResolvedValue({ data: { session: { user } } });
      mockSignInWithPassword.mockResolvedValue({ data: null, error: { message: 'Wrong password' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.updatePassword('wrong', 'new'))).rejects.toThrow('Current password is incorrect');
    });

    it('throws when updateUser fails', async () => {
      const user = { id: 'u1', email: 'u@b.com' };
      mockGetSession.mockResolvedValue({ data: { session: { user } } });
      mockSignInWithPassword.mockResolvedValue({ data: { user }, error: null });
      mockUpdateUser.mockResolvedValue({ error: { message: 'Weak password' } });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await expect(act(async () => auth.updatePassword('current', 'new'))).rejects.toThrow('Weak password');
    });

    it('succeeds when current password correct and updateUser succeeds', async () => {
      const user = { id: 'u1', email: 'u@b.com' };
      mockGetSession.mockResolvedValue({ data: { session: { user } } });
      mockSignInWithPassword.mockResolvedValue({ data: { user }, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });
      let auth;
      render(
        <AuthProvider>
          <Consumer onAuth={(a) => { auth = a; }} />
        </AuthProvider>
      );
      await act(async () => {});
      await act(async () => { await auth.updatePassword('current', 'new'); });
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'u@b.com', password: 'current' });
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'new' });
    });
  });
});
