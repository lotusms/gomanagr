/**
 * Reusable page header: title, description, and an optional action buttons area.
 * Layout: title + description on the left; actions on the right (justified between).
 * @param {string} title - Page title
 * @param {string} [description] - Optional description below the title
 * @param {React.ReactNode} [actions] - Optional content (e.g. buttons) on the right
 * @param {string} [className] - Optional extra classes for the root container
 */
export default function PageHeader({ title, description, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {description != null && description !== '' && (
          <p className="text-gray-600">{description}</p>
        )}
      </div>
      {actions != null && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
