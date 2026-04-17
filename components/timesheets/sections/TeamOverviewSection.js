import { HiUsers } from 'react-icons/hi';

/**
 * Team tab: roadmap copy for org-wide time visibility (filters, compliance).
 */
export default function TeamOverviewSection({ teamTerm, projectTerm, clientTerm }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 sm:p-6 shadow-sm max-sm:-mx-1">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <HiUsers className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden />
        {teamTerm} overview
      </h2>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
        See who submitted, who is clocked in, overtime, and missing entries—filtered by location,{' '}
        {projectTerm.toLowerCase()}, {clientTerm.toLowerCase()}, or department. Full implementation will respect role-based
        visibility for rates and payroll.
      </p>
    </div>
  );
}
