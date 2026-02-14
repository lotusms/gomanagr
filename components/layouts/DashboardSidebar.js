import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  HiFolder,
  HiUsers,
  HiHome,
  HiCalendar,
  HiUserGroup,
  HiInbox,
  HiDocumentSearch,
  HiBriefcase,
  HiDocumentText,
  HiSpeakerphone,
  HiChartBar,
  HiCurrencyDollar,
  HiClock,
  HiChatAlt2,
  HiViewGrid,
} from 'react-icons/hi';
import SidebarToggle from '@/components/layouts/SidebarToggle';

const NAVIGATION = [
  { name: 'Home', href: '/dashboard', icon: HiHome },
  { name: 'Projects', href: '/dashboard/projects', icon: HiFolder },
  { name: 'Team', href: '/dashboard/team', icon: HiUsers },
  { name: 'Schedule', href: '/dashboard/schedule', icon: HiCalendar },
  { divider: true },
  { name: 'Clients', href: '/dashboard/clients', icon: HiUserGroup },
  { name: 'Requests', href: '/dashboard/requests', icon: HiInbox },
  { name: 'Quotes', href: '/dashboard/quotes', icon: HiDocumentSearch },
  { name: 'Jobs', href: '/dashboard/jobs', icon: HiBriefcase },
  { name: 'Invoices', href: '/dashboard/invoices', icon: HiDocumentText },
  { divider: true },
  { name: 'Marketing', href: '/dashboard/marketing', icon: HiSpeakerphone },
  { name: 'Insights', href: '/dashboard/insights', icon: HiChartBar },
  { name: 'Expenses', href: '/dashboard/expenses', icon: HiCurrencyDollar },
  { name: 'Timesheets', href: '/dashboard/timesheets', icon: HiClock },
  { name: 'Apps', href: '/dashboard/apps', icon: HiViewGrid },
];

const MD_BREAKPOINT = 768;

/**
 * Dashboard sidebar: collapsible nav (icons only when collapsed).
 * @param {Object} props
 * @param {boolean} props.open - Whether the sidebar is expanded (shows labels).
 * @param {(open: boolean) => void} props.onToggle - Called when toggle button is used, or when a nav link is clicked on mobile (sm and below) to collapse.
 */
export default function DashboardSidebar({ open, onToggle }) {
  const router = useRouter();

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < MD_BREAKPOINT) {
      onToggle(false);
    }
  };

  return (
    <aside
      className={`translate-x-0 fixed top-16 bottom-0 left-0 z-40 bg-slate-100 border-r border-slate-200 transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-16'
      }`}
    >
      {/* <SidebarToggle expanded={open} onToggle={() => onToggle(!open)} /> */}

      <div className="h-full overflow-y-auto overflow-x-hidden">
        <nav className={`py-3 space-y-0.5 transition-all duration-300 ${open ? 'px-3' : 'px-2'}`}>
          {NAVIGATION.map((item, index) => {
            if (item.divider) {
              return <hr key={`divider-${index}`} className="border-gray-200 my-1.5" />;
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
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
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
