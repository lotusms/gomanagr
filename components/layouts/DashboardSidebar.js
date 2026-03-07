import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import {
  HiFolder,
  HiUsers,
  HiHome,
  HiCalendar,
  HiUserGroup,
  HiDocumentText,
  HiBriefcase,
  HiSpeakerphone,
  HiChartBar,
  HiCurrencyDollar,
  HiClock,
  HiChatAlt2,
  HiViewGrid,
  HiClipboardList,
  HiTag,
} from 'react-icons/hi';
import SidebarToggle from '@/components/layouts/SidebarToggle';
import { getProjectTermForIndustry, getTermForIndustry } from '@/components/clients/clientProfileConstants';
import { isOwnerRole, isAdminRole, isMemberRole, ORG_ROLE } from '@/config/rolePermissions';

function getOwnerNavItems(accountIndustry) {
  const projectTerm = getProjectTermForIndustry(accountIndustry);
  const teamTerm = getTermForIndustry(accountIndustry, 'team');
  return [
    { name: 'Home', href: '/dashboard', icon: HiHome },
    { name: teamTerm, href: '/dashboard/team', icon: HiUsers },
    { name: projectTerm, href: '/dashboard/projects', icon: HiFolder },
    { name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar },
    { divider: true },
    { name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup },
    { name: 'Services', href: '/dashboard/services', icon: HiTag },
    { name: 'Proposals', href: '/dashboard/proposals', icon: HiDocumentText },
    { name: 'Invoices', href: '/dashboard/invoices', icon: HiCurrencyDollar },
    { name: 'Contracts', href: '/dashboard/contracts', icon: HiClipboardList },
    { divider: true },
    { name: 'Marketing', href: '/dashboard/marketing', icon: HiSpeakerphone },
    { name: 'Insights', href: '/dashboard/insights', icon: HiChartBar },
    { name: 'Timesheets', href: '/dashboard/timesheets', icon: HiClock },
    { name: 'Apps', href: '/dashboard/apps', icon: HiViewGrid },
  ];
}

function getAdminNavItems(accountIndustry, memberRole) {
  const projectTerm = getProjectTermForIndustry(accountIndustry);
  const teamTerm = getTermForIndustry(accountIndustry, 'team');
  const items = [
    { name: 'Home', href: '/dashboard/team-member', icon: HiHome },
    { name: 'My Profile', href: '/dashboard/team-member/profile', icon: HiUserGroup },
    { name: teamTerm, href: '/dashboard/team', icon: HiUsers },
    { name: projectTerm, href: '/dashboard/projects', icon: HiFolder },
    { name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar },
    { divider: true },
    { name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup },
    { name: 'Services', href: '/dashboard/services', icon: HiTag },
  ];
  if (memberRole !== ORG_ROLE.DEVELOPER) {
    items.push({ name: 'Proposals', href: '/dashboard/proposals', icon: HiDocumentText });
  }
  items.push(
    { name: 'Invoices', href: '/dashboard/invoices', icon: HiCurrencyDollar },
    { name: 'Contracts', href: '/dashboard/contracts', icon: HiClipboardList },
    { divider: true },
    { name: 'Apps', href: '/dashboard/apps', icon: HiViewGrid }
  );
  return items;
}

const MD_BREAKPOINT = 768;

/** Paths that must match exactly (no child routes). Home/dashboard only when on that page. */
const EXACT_ONLY_HREFS = ['/dashboard', '/dashboard/team-member'];

/**
 * Returns true if the current path should highlight this nav item.
 * Home/dashboard: exact match only. Others: exact or any child route (e.g. Clients active on /dashboard/clients/123/edit).
 */
function isNavItemActive(pathname, href) {
  if (EXACT_ONLY_HREFS.includes(href)) return pathname === href;
  if (pathname === href) return true;
  const prefix = href.endsWith('/') ? href : href + '/';
  return pathname.startsWith(prefix);
}

function getMemberNavItems(memberAccess, accountIndustry) {
  const projectTerm = getProjectTermForIndustry(accountIndustry);
  const items = [
    { name: 'Home', href: '/dashboard/team-member', icon: HiHome },
    { name: 'My Profile', href: '/dashboard/team-member/profile', icon: HiUserGroup },
    { name: projectTerm, href: '/dashboard/projects', icon: HiFolder },
    { name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar },
    { name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup },
    { name: 'Services', href: '/dashboard/services', icon: HiTag },
    { name: 'Contracts', href: '/dashboard/contracts', icon: HiClipboardList },
  ];
  return items;
}

/**
 * Dashboard sidebar: collapsible nav (icons only when collapsed).
 * @param {Object} props
 * @param {boolean} props.open - Whether the sidebar is expanded (shows labels).
 * @param {(open: boolean) => void} props.onToggle - Called when toggle button is used, or when a nav link is clicked on mobile (sm and below) to collapse.
 * @param {Object} props.userAccount - User account object containing industry field
 * @param {string} [props.memberRole] - Org role; when 'member', only allowed sections are shown
 * @param {Object} [props.memberAccess] - For members: { schedule, clients, projects } from admin config
 * @param {boolean} [props.isOwner] - True for org creator (isOwner=true); controls owner vs admin nav
 * @param {boolean} [props.orgLoaded] - True once org (and thus memberRole) has been loaded; when false, show minimal placeholder nav to avoid flash
 */
export default function DashboardSidebar({ open, onToggle, userAccount, organization, memberRole, memberAccess, isOwner, orgLoaded }) {
  const router = useRouter();
  const accountIndustry = organization?.industry ?? userAccount?.industry;

  const placeholderNav = useMemo(() => [{ name: 'Home', href: '/dashboard/team-member', icon: HiHome }], []);

  const navigationItems = useMemo(() => {
    if (!orgLoaded) return placeholderNav;
    if (isMemberRole(memberRole)) return getMemberNavItems(memberAccess, accountIndustry);
    if (isOwnerRole(memberRole)) return getOwnerNavItems(accountIndustry);
    if (isAdminRole(memberRole)) return getAdminNavItems(accountIndustry, memberRole);
    return getAdminNavItems(accountIndustry, memberRole);
  }, [orgLoaded, memberRole, memberAccess, accountIndustry, placeholderNav]);

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < MD_BREAKPOINT) {
      onToggle(false);
    }
  };

  return (
    <aside
      className={`translate-x-0 fixed top-16 bottom-0 left-0 z-40 bg-slate-100 dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-16'
      }`}
    >
      {/* <SidebarToggle expanded={open} onToggle={() => onToggle(!open)} /> */}

      <div className="h-full overflow-y-auto overflow-x-hidden">
        <nav className={`py-3 space-y-0.5 transition-all duration-300 ${open ? 'px-3' : 'px-2'}`}>
          {navigationItems.map((item, index) => {
            if (item.divider) {
              return <hr key={`divider-${index}`} className="border-gray-200 dark:border-gray-700 my-1.5" />;
            }
            const isActive = isNavItemActive(router.pathname, item.href);
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center rounded-lg transition-all duration-200 ${
                  open ? 'space-x-2.5 px-3 py-2' : 'justify-center px-2 py-2'
                } ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                title={!open ? item.name : ''}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`whitespace-nowrap transition-opacity duration-200 ${
                    open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
