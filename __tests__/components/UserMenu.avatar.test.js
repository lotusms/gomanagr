import React from 'react';
import { render, screen } from '@testing-library/react';
import UserMenu from '@/components/layouts/UserMenu';

const mockOnLogout = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), reload: jest.fn(), pathname: '/dashboard' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/AuthContext', () => ({ useAuth: () => ({}), AuthProvider: ({ children }) => children }));
jest.mock('@/services/userService', () => ({ getUserAccount: () => Promise.resolve(null) }));
const mockIsMemberRole = jest.fn(() => false);

jest.mock('@/config/rolePermissions', () => ({
  isOwnerRole: () => false,
  isAdminRole: () => false,
  isMemberRole: (...args) => mockIsMemberRole(...args),
  isDeveloperRole: () => false,
  isOwnerOrDeveloperRole: () => false,
}));

jest.mock('@/lib/userPermissions', () => ({
  isAdminOrDeveloper: () => false,
}));

describe('UserMenu avatar and display name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMemberRole.mockReturnValue(false);
  });

  it('shows initials in avatar when no company or organization logo was added', () => {
    const userAccount = {
      firstName: 'Luis',
      lastName: 'Silva',
      companyLogo: '',
      nameView: 'full',
    };
    const organization = { logo_url: '' };

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'luis@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button).toBeInTheDocument();
    const avatar = button.querySelector('[role="img"]');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('aria-label', 'Avatar for Luis Silva');
    expect(button.querySelector('img')).not.toBeInTheDocument();
    expect(button.querySelector('span')).toHaveTextContent('LS');
  });

  it('shows company/registration logo in avatar when user added logo and no org logo', () => {
    const userAccount = {
      firstName: 'Luis',
      lastName: 'Silva',
      companyLogo: 'https://example.com/my-company-logo.png',
      nameView: 'full',
    };
    const organization = {}; // no org logo so user company logo is used

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'luis@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const button = screen.getByRole('button', { name: /user menu/i });
    const img = button.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/my-company-logo.png');
  });

  it('shows organization logo in avatar when org has logo (non-member: org logo takes priority over company logo)', () => {
    const userAccount = {
      firstName: 'Luis',
      lastName: 'Silva',
      companyLogo: 'https://example.com/my-company-logo.png',
      nameView: 'full',
    };
    const organization = { logo_url: 'https://example.com/org-logo.png' };

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'luis@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const button = screen.getByRole('button', { name: /user menu/i });
    const img = button.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/org-logo.png');
  });

  it('team member: shows personal photo over org logo when photoUrl is set', () => {
    mockIsMemberRole.mockReturnValue(true);
    const userAccount = {
      firstName: 'Amanda',
      lastName: 'Nunez',
      photoUrl: 'https://example.com/amanda.png',
      companyLogo: '',
      nameView: 'full',
    };
    const organization = {
      logo_url: 'https://example.com/org-logo.png',
      membership: { role: 'member' },
    };

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'amanda@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const img = screen.getByRole('button', { name: /user menu/i }).querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/amanda.png');
  });

  it('team member: shows org logo when they have no personal photo', () => {
    mockIsMemberRole.mockReturnValue(true);
    const userAccount = {
      firstName: 'Amanda',
      lastName: 'Nunez',
      companyLogo: '',
      nameView: 'full',
    };
    const organization = {
      logo_url: 'https://example.com/org-logo.png',
      membership: { role: 'member' },
    };

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'amanda@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const img = screen.getByRole('button', { name: /user menu/i }).querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/org-logo.png');
  });

  it('team member: prefers companyLogo over org logo when that is their only uploaded image', () => {
    mockIsMemberRole.mockReturnValue(true);
    const userAccount = {
      firstName: 'Amanda',
      lastName: 'Nunez',
      companyLogo: 'https://example.com/my-upload.png',
      nameView: 'full',
    };
    const organization = {
      logo_url: 'https://example.com/org-logo.png',
      membership: { role: 'member' },
    };

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'amanda@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const img = screen.getByRole('button', { name: /user menu/i }).querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/my-upload.png');
  });

  it('shows initials when account has no logo and no org logo (first name only)', () => {
    const userAccount = {
      firstName: 'Luis',
      lastName: '',
      companyLogo: '',
      nameView: 'first',
    };
    const organization = { logo_url: '' };

    render(
      <UserMenu
        userAccount={userAccount}
        currentUser={{ email: 'luis@example.com' }}
        organization={organization}
        onLogout={mockOnLogout}
      />
    );

    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button.querySelector('span')).toHaveTextContent('L');
    expect(button.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows loading placeholder when userAccount is null (before load)', () => {
    render(
      <UserMenu
        userAccount={null}
        previewAccount={null}
        currentUser={{ email: 'luis@example.com' }}
        organization={null}
        onLogout={mockOnLogout}
      />
    );

    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('img')).not.toBeInTheDocument();
    expect(button.querySelector('div.rounded-full.bg-gray-200')).toBeInTheDocument();
  });
});
