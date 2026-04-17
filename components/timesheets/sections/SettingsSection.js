export default function SettingsSection() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization defaults (preview)</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Onboarding will guide primary purpose (payroll, billing, costing, attendance), default entry mode (manual, timer,
        clock), what time links to (clients, jobs, cases, appointments...), approvals, and overtime— not only industry.
      </p>
      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
        <li>Separate toggles for billable, costable, and payable where they differ.</li>
        <li>Default tracking mode: hybrid-friendly (office vs field vs shift).</li>
        <li>Optional fields: breaks, location, attachments, tags— shown when relevant.</li>
      </ul>
    </div>
  );
}
