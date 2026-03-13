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

    // Order must match DashboardSidebar getOwnerNavItems: Projects, Contracts, Proposals, Invoices, then (after divider) Tasks, ...
    const expected = [
      { name: 'Home', href: '/dashboard' },
      { name: 'Team', href: '/dashboard/team' },
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Contracts', href: '/dashboard/contracts' },
      { name: 'Proposals', href: '/dashboard/proposals' },
      { name: 'Invoices', href: '/dashboard/invoices' },
      { name: 'Receipts', href: '/dashboard/receipts' },
      { name: 'Tasks', href: '/dashboard/tasks' },
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
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Contracts', href: '/dashboard/contracts' },
      { name: 'Proposals', href: '/dashboard/proposals' },
      { name: 'Invoices', href: '/dashboard/invoices' },
      { name: 'Receipts', href: '/dashboard/receipts' },
      { name: 'Tasks', href: '/dashboard/tasks' },
      { name: 'Apps', href: '/dashboard/apps' },
    ];

    expect(items).toHaveLength(expected.length);
    items.forEach((item, i) => {
      expect(item.name).toBe(expected[i].name);
      expect(item.href).toBe(expected[i].href);
    });
  });

  it('developer role: shows same owner nav as superadmin (full access, trial not applied)', () => {
    renderSidebar({ memberRole: 'developer', isOwner: false });

    const items = getNavLinkNamesAndHrefs();
    const expected = [
      { name: 'Home', href: '/dashboard' },
      { name: 'Team', href: '/dashboard/team' },
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Contracts', href: '/dashboard/contracts' },
      { name: 'Proposals', href: '/dashboard/proposals' },
      { name: 'Invoices', href: '/dashboard/invoices' },
      { name: 'Receipts', href: '/dashboard/receipts' },
      { name: 'Tasks', href: '/dashboard/tasks' },
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

  it('member: shows exact member nav items when all sections enabled (Home, My Profile, Schedule, Clients, Services, Projects, Tasks, Contracts)', () => {
    renderSidebar({
      memberRole: 'member',
      memberAccess: { schedule: true, clients: true, projects: true, contracts: true },
    });

    const items = getNavLinkNamesAndHrefs();

    const expected = [
      { name: 'Home', href: '/dashboard/team-member' },
      { name: 'My Profile', href: '/dashboard/team-member/profile' },
      { name: 'Schedule', href: '/dashboard/schedule' },
      { name: 'Clients', href: '/dashboard/clients' },
      { name: 'Services', href: '/dashboard/services' },
      { name: 'Projects', href: '/dashboard/projects' },
      { name: 'Contracts', href: '/dashboard/contracts' },
      { name: 'Tasks', href: '/dashboard/tasks' },
    ];

    expect(items).toHaveLength(expected.length);
    items.forEach((item, i) => {
      expect(item.name).toBe(expected[i].name);
      expect(item.href).toBe(expected[i].href);
    });
  });

  it('member: does not show Team, Proposals, Invoices, Marketing, Insights, Timesheets, Apps (but does show Contracts)', () => {
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
