import { PrimaryButton } from '@/components/ui/buttons';

/**
 * Placeholder for time-off requests (PTO, sick, unpaid) until workflows ship.
 */
export default function MemberTimeOffPanel() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6 sm:p-8 shadow-sm max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request time off</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Submit vacation, sick leave, or other absences so your manager can approve coverage. Your organization may use
        different policies by industry—this flow will connect to that configuration.
      </p>
      <PrimaryButton type="button" className="mt-6" disabled title="Coming soon">
        New time-off request
      </PrimaryButton>
    </div>
  );
}
