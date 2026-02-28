import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardSidebar from '@/components/layouts/DashboardSidebar';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/dashboard' }),
}));

const defaultUserAccount = { industry: null };

function renderSidebar({
  memberRole = null,
  memberAccess = null,
  isOwner = false,
  orgLoaded = true,
  userAccount = defaultUserAccount,
} = {}) {
  return render(
    <DashboardSidebar
      open={true}
      onToggle={() => {}}
      userAccount={userAccount}
      memberRole={memberRole}
      memberAccess={memberAccess}
      isOwner={isOwner}
      orgLoaded={orgLoaded}
    />
  );
}

/** Get visible nav link names and hrefs from the sidebar (order preserved). */
function getNavLinkNamesAndHrefs() {
  const links = screen.getAllByRole('link');
  return links.map((link) => ({ name: link.textContent.trim(), href: link.getAttribute('href') }));
}

describe('DashboardSidebar role-based navigation', () => {
  it('superadmin (owner): shows exact owner nav items in order', () => {
    renderSidebar({ memberRole: 'superadmin', isOwner: true });

    const items = getNavLinkNamesAndHrefs();

    const expected = [
      { name: 'Home', href: '/dashboard' },
      { name: 'Team', href: '/dashboard/team' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Proposals', href: '/dashboard/proposals' },
      { name: 'Quotes', href: '/dashboard/quotes' },
      { name: 'Invoices', href: '/dashboard/invoices' },
      { name: 'Contracts', href: '/dashboard/contracts' },
      { name: 'Marketing', href: '/dashboard/marketing' },
      { name: 'Insights', href: '/dashboard/insights' },
      { name: 'Timesheets', href: '/dashboard/timesheets' },
      { name: 'Apps', href: '/dashboard/apps' },
    ];

    expect(items).toHaveLength(expected.length);
    items.forEach((item, i) => {
      expect(item.name).toBe(expected[i].name);
      expect(item.href).toBe(expected[i].href);
    });
  });

  it('admin: shows exact admin nav items in order (no Marketing, Insights, Timesheets)', () => {
    renderSidebar({ memberRole: 'admin', isOwner: false });

    const items = getNavLinkNamesAndHrefs();

    const expected = [
      { name: 'Home', href: '/dashboard/team-member' },
      { name: 'My Profile', href: '/dashboard/team-member/profile' },
      { name: 'Team', href: '/dashboard/team' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Proposals', href: '/dashboard/proposals' },
      { name: 'Quotes', href: '/dashboard/quotes' },
      { name: 'Invoices', href: '/dashboard/invoices' },
      { name: 'Contracts', href: '/dashboard/contracts' },
      { name: 'Apps', href: '/dashboard/apps' },
    ];

    expect(items).toHaveLength(expected.length);
    items.forEach((item, i) => {
      expect(item.name).toBe(expected[i].name);
      expect(item.href).toBe(expected[i].href);
    });
  });

  it('developer role: shows admin nav without Proposals (superadmin and admin only)', () => {
    renderSidebar({ memberRole: 'developer', isOwner: false });

    const items = getNavLinkNamesAndHrefs();
    const names = items.map((i) => i.name);

    expect(items).toHaveLength(11);
    expect(names).not.toContain('Proposals');
    expect(items[0]).toEqual({ name: 'Home', href: '/dashboard/team-member' });
    expect(items[1]).toEqual({ name: 'My Profile', href: '/dashboard/team-member/profile' });
    expect(items[10]).toEqual({ name: 'Apps', href: '/dashboard/apps' });
  });

  it('member: shows exact member nav items (Home, My Profile, Projects, Schedule, Clients, Services, Contracts)', () => {
    renderSidebar({ memberRole: 'member', memberAccess: {} });

    const items = getNavLinkNamesAndHrefs();

    const expected = [
      { name: 'Home', href: '/dashboard/team-member' },
      { name: 'My Profile', href: '/dashboard/team-member/profile' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Contracts', href: '/dashboard/contracts' },
    ];

    expect(items).toHaveLength(expected.length);
    items.forEach((item, i) => {
      expect(item.name).toBe(expected[i].name);
      expect(item.href).toBe(expected[i].href);
    });
  });

  it('member: does not show Team, Proposals, Quotes, Invoices, Marketing, Insights, Timesheets, Apps (but does show Contracts)', () => {
    renderSidebar({ memberRole: 'member', memberAccess: {} });

    const links = screen.getAllByRole('link');
    const names = links.map((l) => l.textContent.trim());

    expect(names).not.toContain('Team');
    expect(names).not.toContain('Proposals');
    expect(names).not.toContain('Quotes');
    expect(names).not.toContain('Invoices');
    expect(names).not.toContain('Marketing');
    expect(names).not.toContain('Insights');
    expect(names).not.toContain('Timesheets');
    expect(names).not.toContain('Apps');
  });

  it('when org not loaded: shows only placeholder (Home to team-member)', () => {
    renderSidebar({ orgLoaded: false });

    const items = getNavLinkNamesAndHrefs();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ name: 'Home', href: '/dashboard/team-member' });
  });
});
