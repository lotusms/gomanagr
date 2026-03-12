/**
 * Unit tests for ThemeSettings: render, theme mode toggle, palette selection, loading state
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeSettings from '@/components/settings/ThemeSettings';

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1', email: 'u@example.com' } }),
}));

const setPaletteMock = jest.fn();
jest.mock('@/lib/ThemeContext', () => ({
  useTheme: () => ({ currentPalette: 'default', setPalette: setPaletteMock }),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: jest.fn(() => Promise.resolve({ themeMode: 'light' })),
  createUserAccount: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/themes', () => ({
  palettes: {
    default: { name: 'Default', description: 'Default palette', colors: { primary: { 500: '#06b6d4', 600: '#0891b2' }, secondary: { 500: '#0284c7', 600: '#0369a1' }, ternary: { 500: '#10b981', 600: '#059669' } } },
    ocean: { name: 'Ocean', description: 'Ocean palette', colors: { primary: { 500: '#0ea5e9', 600: '#0284c7' }, secondary: {}, ternary: {} } },
  },
}), { virtual: true });

jest.mock('@/components/ui/Toggle', () => function MockToggle({ id, label, value, onValueChange, option1Label, option2Label }) {
  return (
    <div data-testid={`toggle-${id}`}>
      <span>{label}</span>
      <button type="button" onClick={() => onValueChange(option1Label === 'Light' ? 'light' : 'dark')} aria-label={option1Label}>
        {option1Label}
      </button>
      <button type="button" onClick={() => onValueChange(option2Label === 'Dark' ? 'dark' : 'light')} aria-label={option2Label}>
        {option2Label}
      </button>
      <span data-value={value}>{value}</span>
    </div>
  );
});

describe('ThemeSettings', () => {
  it('renders Theme Settings heading and description', async () => {
    render(<ThemeSettings />);
    await screen.findByRole('heading', { name: 'Theme Settings' });
    expect(screen.getByText(/Customize your application appearance/)).toBeInTheDocument();
  });

  it('shows Theme Mode toggle and Color Palette section', async () => {
    render(<ThemeSettings />);
    await screen.findByText('Theme Mode');
    expect(screen.getByText('Color Palette')).toBeInTheDocument();
  });

  it('renders palette options after loading', async () => {
    render(<ThemeSettings />);
    await screen.findByText('Default');
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('calls handlePaletteSelect when palette button is clicked', async () => {
    render(<ThemeSettings />);
    const defaultBtn = await screen.findByRole('button', { name: /Default/i });
    await userEvent.click(defaultBtn);
    const themeContext = require('@/lib/ThemeContext');
    expect(themeContext.useTheme().setPalette).toHaveBeenCalled();
  });
});
