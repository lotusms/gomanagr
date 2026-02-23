import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import {
  HiFolder,
  HiUsers,
  HiHome,
  HiCalendar,
  HiUserGroup,
  HiInbox,
  HiDocumentSearch,
  HiBriefcase,
  HiSpeakerphone,
  HiChartBar,
  HiCurrencyDollar,
  HiClock,
  HiChatAlt2,
  HiViewGrid,
  HiClipboardList,
} from 'react-icons/hi';
import SidebarToggle from '@/components/layouts/SidebarToggle';
import { getProjectTermForIndustry } from '@/components/clients/clientProfileConstants';

function getOwnerNavItems(accountIndustry) {
  const projectTerm = getProjectTermForIndustry(accountIndustry);
  return [
    { name: 'Home', href: '/dashboard', icon: HiHome },
    { name: projectTerm, href: '/dashboard/projects', icon: HiFolder },
    { name: 'Team', href: '/dashboard/team', icon: HiUsers },
    { name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar },
    { divider: true },
    { name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup },
    { name: 'Services', href: '/dashboard/services', icon: HiClipboardList },
    { name: 'Requests', href: '/dashboard/requests', icon: HiInbox },
    { name: 'Quotes', href: '/dashboard/quotes', icon: HiDocumentSearch },
    { name: 'Invoices', href: '/dashboard/invoices', icon: HiCurrencyDollar },
    { divider: true },
    { name: 'Marketing', href: '/dashboard/marketing', icon: HiSpeakerphone },
    { name: 'Insights', href: '/dashboard/insights', icon: HiChartBar },
    { name: 'Timesheets', href: '/dashboard/timesheets', icon: HiClock },
    { name: 'Apps', href: '/dashboard/apps', icon: HiViewGrid },
  ];
}

function getAdminNavItems(accountIndustry) {
  const projectTerm = getProjectTermForIndustry(accountIndustry);
  return [
    { name: 'Home', href: '/dashboard', icon: HiHome },
    { name: projectTerm, href: '/dashboard/projects', icon: HiFolder },
    { name: 'My Profile', href: '/dashboard/team-member/profile', icon: HiUserGroup },
    { name: 'Team', href: '/dashboard/team', icon: HiUsers },
    { name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar },
    { divider: true },
    { name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup },
    { name: 'Services', href: '/dashboard/services', icon: HiClipboardList },
    { name: 'Requests', href: '/dashboard/requests', icon: HiInbox },
    { name: 'Quotes', href: '/dashboard/quotes', icon: HiDocumentSearch },
    { name: 'Invoices', href: '/dashboard/invoices', icon: HiCurrencyDollar },
    { divider: true },
    { name: 'Apps', href: '/dashboard/apps', icon: HiViewGrid },
  ];
}

const MD_BREAKPOINT = 768;

function getMemberNavItems(memberAccess, accountIndustry) {
  const projectTerm = getProjectTermForIndustry(accountIndustry);
  const items = [
    { name: 'Dashboard', href: '/dashboard/team-member', icon: HiHome },
    { name: 'My Profile', href: '/dashboard/team-member/profile', icon: HiUserGroup },
  ];
  if (memberAccess?.projects) items.push({ name: projectTerm, href: '/dashboard/projects', icon: HiFolder });
  if (memberAccess?.schedule) items.push({ name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar });
  if (memberAccess?.clients) items.push({ name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup });
  items.push({ name: 'Services', href: '/dashboard/services', icon: HiClipboardList });
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
 */
export default function DashboardSidebar({ open, onToggle, userAccount, memberRole, memberAccess, isOwner }) {
  const router = useRouter();

  const navigationItems = useMemo(() => {
    if (memberRole === 'member') return getMemberNavItems(memberAccess, userAccount?.industry);
    if (memberRole === 'admin' || memberRole === 'developer') return isOwner ? getOwnerNavItems(userAccount?.industry) : getAdminNavItems(userAccount?.industry);
    return getOwnerNavItems(userAccount?.industry);
  }, [memberRole, memberAccess, userAccount?.industry, isOwner]);

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
            const isActive = router.pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center rounded-lg transition-all duration-300 ${
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
