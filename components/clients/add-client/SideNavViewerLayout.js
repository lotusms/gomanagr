/**
 * Layout with a side nav and a viewer area (header + content card).
 * Used by Communication Log and Documents & Files sections.
 *
 * @param {string} [introText] - Optional paragraph above the layout
 * @param {string} navAriaLabel - Aria label for the side nav
 * @param {Array<{key: string, label: string, icon: React.ComponentType, badgeClass: string, count?: number|null}>} navItems
 * @param {string} selectedKey - Currently selected item key
 * @param {(key: string) => void} onSelectKey - Called when user selects a nav item
 * @param {{ icon: React.ComponentType, title: string, description?: string, badgeClass: string } | null} viewerHeader - Header for the viewer (title, description, icon)
 * @param {React.ReactNode} [viewerHeaderAction] - Optional action (e.g. Add button) on the right of the header
 * @param {React.ReactNode} children - Content inside the viewer card
 */

export default function SideNavViewerLayout({
  introText,
  navAriaLabel,
  navItems,
  selectedKey,
  onSelectKey,
  viewerHeader,
  viewerHeaderAction,
  children,
}) {
  return (
    <div className="space-y-4">
      {introText && (
        <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide max-w-2xl">
          {introText}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-0 sm:gap-6 min-h-[420px]">
        <nav
          className="flex sm:flex-col gap-1 sm:w-52 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 pb-4 sm:pb-0 sm:pr-4"
          aria-label={navAriaLabel}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectKey(item.key)}
                className={`
                  flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${item.badgeClass}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="truncate">{item.label}</span>
                {item.count != null && item.count > 0 && (
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 tabular-nums">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 pt-4 sm:pt-0">
          {viewerHeader && (() => {
            const HeaderIcon = viewerHeader.icon;
            return (
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4 border-b border-primary-200 dark:border-primary-700 pb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {HeaderIcon && (
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${viewerHeader.badgeClass}`}>
                      <HeaderIcon className="w-4 h-4" />
                    </span>
                  )}
                  {viewerHeader.title}
                </h3>
                {viewerHeader.description && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{viewerHeader.description}</p>
                )}
              </div>
              {viewerHeaderAction}
            </div>
            );
          })()}
            
          {children}
          
        </div>
      </div>
    </div>
  );
}
