export default function PlaceholderPanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto">{children}</p>
    </div>
  );
}
