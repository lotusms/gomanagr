import { useMemo } from 'react';
import {
  HiFolder,
  HiUsers,
  HiCurrencyDollar,
  HiUserGroup,
} from 'react-icons/hi';
import { getProjectTermForIndustry, getTermForIndustry } from '@/components/clients/clientProfileConstants';

function countTotalProjectsFromClients(clients) {
  if (!Array.isArray(clients) || clients.length === 0) return 0;
  return clients.reduce((sum, client) => {
    const active = client.activeProjects?.length ?? 0;
    const completed = client.completedProjects?.length ?? 0;
    return sum + active + completed;
  }, 0);
}

function getStats(userAccount, organization, teamMemberCount, apiCounts) {
  const counts = apiCounts && typeof apiCounts === 'object' ? apiCounts : {};
  const industry = organization?.industry ?? userAccount?.industry;
  const projectTerm = getProjectTermForIndustry(industry);
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const clients = userAccount?.clients ?? [];
  const totalProjects =
    counts.projectCount !== undefined && counts.projectCount !== null
      ? counts.projectCount
      : countTotalProjectsFromClients(clients);
  const totalClients =
    counts.clientCount !== undefined && counts.clientCount !== null
      ? counts.clientCount
      : clients.length;
  const teamCount = teamMemberCount ?? userAccount?.teamMembers?.length ?? 0;
  const invoiceCount =
    counts.invoiceCount !== undefined && counts.invoiceCount !== null
      ? counts.invoiceCount
      : (userAccount?.invoices?.length ?? 0);

  return [
    { title: `Total ${projectTerm}`, value: String(totalProjects), accent: 'blue', Icon: HiFolder },
    { title: 'Clients', value: String(totalClients), accent: 'emerald', Icon: HiUserGroup },
    { title: teamMemberTerm, value: String(teamCount), accent: 'primary', Icon: HiUsers },
    { title: 'Total Invoices', value: String(invoiceCount), accent: 'amber', Icon: HiCurrencyDollar },
  ];
}

const ACCENT_STYLES = {
  blue: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-500',
    iconRing: 'ring-blue-500/20',
    glow: 'shadow-blue-500/10',
    cardBg: 'bg-gradient-to-br from-blue-500/[0.06] to-transparent dark:from-blue-500/10 dark:to-transparent',
  },
  emerald: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500',
    iconRing: 'ring-emerald-500/20',
    glow: 'shadow-emerald-500/10',
    cardBg: 'bg-gradient-to-br from-emerald-500/[0.06] to-transparent dark:from-emerald-500/10 dark:to-transparent',
  },
  primary: {
    border: 'border-l-primary-500',
    iconBg: 'bg-primary-500',
    iconRing: 'ring-primary-500/20',
    glow: 'shadow-primary-500/10',
    cardBg: 'bg-gradient-to-br from-primary-500/[0.06] to-transparent dark:from-primary-500/10 dark:to-transparent',
  },
  amber: {
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-500',
    iconRing: 'ring-amber-500/20',
    glow: 'shadow-amber-500/10',
    cardBg: 'bg-gradient-to-br from-amber-500/[0.06] to-transparent dark:from-amber-500/10 dark:to-transparent',
  },
};

const StatCard = ({ title, value, sub, accent, Icon }) => {
  const style = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;
  return (
    <div
      className={
        'group relative overflow-hidden rounded-xl border border-l-4 border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 p-6 shadow-lg shadow-gray-200/50 dark:shadow-none dark:ring-1 dark:ring-gray-700/50 hover:shadow-xl hover:shadow-gray-300/50 dark:hover:ring-gray-600 transition-all duration-300 ease-out ' +
        style.border +
        ' ' +
        style.cardBg
      }
    >
      <Icon className="size-[180px] absolute -bottom-13 -right-5 text-gray-200 dark:text-gray-700 opacity-50 group-hover:opacity-20 transition-opacity duration-300" aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white tabular-nums">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs font-medium text-gray-400 dark:text-gray-500">{sub}</p>
          )}
        </div>
        <div
          className={
            'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white ring-4 shadow-lg group-hover:scale-105 transition-transform duration-300 ' +
            style.iconBg +
            ' ' +
            style.iconRing
          }
        >
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      </div>
    </div>
  );
};

/**
 * StatsGrid Component
 * @param {Object} props
 * @param {Object} props.userAccount - User account (clients, industry, teamMembers, invoices, etc.)
 * @param {number} [props.teamMemberCount] - Organization member count (when using org-based team)
 * @param {Object} [props.apiCounts] - Optional counts from APIs: { clientCount, projectCount, invoiceCount }
 */
export default function StatsGrid({ userAccount, organization, teamMemberCount, apiCounts }) {
  const stats = useMemo(
    () => getStats(userAccount ?? {}, organization ?? null, teamMemberCount, apiCounts),
    [userAccount, organization, teamMemberCount, apiCounts]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
