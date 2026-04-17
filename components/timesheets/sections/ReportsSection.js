const REPORT_CARDS = ['Hours by person', 'Hours by client / job', 'Utilization & overtime', 'Exceptions & missing time'];

export default function ReportsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {REPORT_CARDS.map((label) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5 shadow-sm"
        >
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Report builder — coming soon.</p>
        </div>
      ))}
    </div>
  );
}
