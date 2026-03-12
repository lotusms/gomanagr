/**
 * Unit tests for utils/useRequireAuth.js
 */
import { renderHook } from '@testing-library/react';
import { useRequireAuth } from '@/utils/useRequireAuth';

const mockReplace = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

let mockUseAuth = () => ({ currentUser: null, loading: true });

describe('useRequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth = () => ({ currentUser: null, loading: true });
  });

  it('returns currentUser and loading from useAuth', () => {
    mockUseAuth = () => ({ currentUser: { uid: 'u1' }, loading: false });
    const { result } = renderHook(() => useRequireAuth());
    expect(result.current).toEqual({ currentUser: { uid: 'u1' }, loading: false });
  });

  it('calls router.replace(/login) when not loading and no currentUser', () => {
    mockUseAuth = () => ({ currentUser: null, loading: false });
    renderHook(() => useRequireAuth());
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect when loading', () => {
    mockUseAuth = () => ({ currentUser: null, loading: true });
    renderHook(() => useRequireAuth());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when currentUser exists', () => {
    mockUseAuth = () => ({ currentUser: { uid: 'u1' }, loading: false });
    renderHook(() => useRequireAuth());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
