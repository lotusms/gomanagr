/**
 * Unit tests for PublicLayout: render, default title, header actions (Sign in / Try for free) call router.push.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublicLayout from '@/components/layouts/PublicLayout';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = jest.fn();
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Head so we can assert on title (next/head normally injects into document.head)
jest.mock('next/head', () => ({
  __esModule: true,
  default: function MockHead({ children }) {
    const titleMatch = React.Children.toArray(children).find(
      (c) => c?.props?.children && (c.type === 'title' || c?.type === 'title')
    );
    const titleText = typeof titleMatch?.props?.children === 'string'
      ? titleMatch.props.children
      : '';
    return (
      <div data-testid="next-head" data-title={titleText}>
        {children}
      </div>
    );
  },
}));

describe('PublicLayout', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseAuth.mockReturnValue({ currentUser: null });
  });

  it('renders children and default title', () => {
    render(
      <PublicLayout>
        <p>Page content</p>
      </PublicLayout>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByTestId('next-head')).toHaveAttribute('data-title', 'GoManagr');
  });

  it('uses custom title when provided', () => {
    render(
      <PublicLayout title="Sign In - GoManagr">
        <span>Login form</span>
      </PublicLayout>
    );
    expect(screen.getByTestId('next-head')).toHaveAttribute('data-title', 'Sign In - GoManagr');
    expect(screen.getByText('Login form')).toBeInTheDocument();
  });

  it('Sign in calls router.push(/login)', async () => {
    render(<PublicLayout><div>Child</div></PublicLayout>);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('Try for free calls router.push(/signup)', async () => {
    render(<PublicLayout><div>Child</div></PublicLayout>);
    await userEvent.click(screen.getByRole('button', { name: /try for free/i }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });
});
