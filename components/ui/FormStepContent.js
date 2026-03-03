/**
 * Reusable container for multi-step form content. Provides the rounded panel
 * and optional section header (title + description). Use with FormStepSection
 * for consistent step layout.
 *
 * FormStepContent: outer wrapper (panel styling, min-height).
 * FormStepSection: inner block with optional title/description + children.
 */

const CONTENT_CLASSES =
  'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 min-h-[280px]';
const SECTION_CLASSES = 'space-y-6';
const TITLE_CLASSES = 'text-sm font-semibold text-gray-900 dark:text-white mb-1';
const DESCRIPTION_CLASSES = 'text-xs text-gray-500 dark:text-gray-400 mb-4';

/**
 * Outer panel for step content. Use once per form to wrap all step views.
 */
export function FormStepContent({ children, className = '' }) {
  return <div className={`${CONTENT_CLASSES} ${className}`.trim()}>{children}</div>;
}

/**
 * A single step's block: optional title and description, then children.
 * Use inside FormStepContent for each step view.
 *
 * @param {string} [title] - Step heading (e.g. "Details")
 * @param {string} [description] - Subtitle/helper text
 * @param {React.ReactNode} children
 * @param {string} [className]
 */
export function FormStepSection({ title, description, children, className = '' }) {
  return (
    <div className={`${SECTION_CLASSES} ${className}`.trim()}>
      {(title || description) && (
        <div>
          {title && <h3 className={TITLE_CLASSES}>{title}</h3>}
          {description && <p className={DESCRIPTION_CLASSES}>{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
