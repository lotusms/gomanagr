import { render, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';

const mockGetUserAccount = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: (userId) => mockGetUserAccount(userId),
  updateUserTheme: jest.fn().mockResolvedValue(undefined),
}));

const mockPalettes = {
  palette1: {
    name: 'Default',
    colors: {
      primary: { 500: '#06b6d4' },
      secondary: { 500: '#0284c7' },
      ternary: { 500: '#10b981' },
    },
  },
  palette2: {
    name: 'Alternate',
    colors: {
      primary: { 500: '#7c3aed' },
      secondary: { 500: '#db2777' },
      ternary: { 500: '#059669' },
    },
  },
};

jest.mock('@/config/themes', () => ({
  palettes: mockPalettes,
  defaultPalette: 'palette1',
  getPalette: () => ({}),
  getAllPalettes: () => [],
  getPaletteForTailwind: () => ({}),
  getThemeColorsRgb: () => ({}),
}));

function TestChild() {
  return <span data-testid="theme-ready">Ready</span>;
}

describe('ThemeContext theme recovery on login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-palette');
      document.documentElement.style.cssText = '';
    }
  });

  it('recovers dark theme when user logs in with themeMode dark', async () => {
    mockGetUserAccount.mockResolvedValue({
      selectedPalette: 'palette1',
      themeMode: 'dark',
    });

    const { getByTestId } = render(
      <AuthProvider>
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme-ready')).toBeInTheDocument();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-palette')).toBe('palette1');
    expect(mockGetUserAccount).toHaveBeenCalled();
  });

  it('recovers light theme when user logs in with themeMode light', async () => {
    mockGetUserAccount.mockResolvedValue({
      selectedPalette: 'palette1',
      themeMode: 'light',
    });

    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
    }

    const { getByTestId } = render(
      <AuthProvider>
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme-ready')).toBeInTheDocument();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-palette')).toBe('palette1');
    expect(mockGetUserAccount).toHaveBeenCalled();
  });

  it('recovers selected palette when user logs in', async () => {
    mockGetUserAccount.mockResolvedValue({
      selectedPalette: 'palette2',
      themeMode: 'light',
    });

    const { getByTestId } = render(
      <AuthProvider>
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme-ready')).toBeInTheDocument();
    });

    expect(document.documentElement.getAttribute('data-palette')).toBe('palette2');
    expect(document.documentElement.style.getPropertyValue('--color-primary-500').trim()).toBe('124 58 237');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(mockGetUserAccount).toHaveBeenCalled();
  });

  it('recovers both theme mode and selected palette when user logs in', async () => {
    mockGetUserAccount.mockResolvedValue({
      selectedPalette: 'palette2',
      themeMode: 'dark',
    });

    const { getByTestId } = render(
      <AuthProvider>
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme-ready')).toBeInTheDocument();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-palette')).toBe('palette2');
    expect(document.documentElement.style.getPropertyValue('--color-primary-500').trim()).toBe('124 58 237');
    expect(mockGetUserAccount).toHaveBeenCalled();
  });
});
