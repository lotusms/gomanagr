/**
 * Reusable step navigation for multi-step forms (proposals, invoices, etc.).
 * Renders numbered step buttons with optional labels and arrow separators.
 *
 * @param {Array<{ id: number, label: string }>} steps - Step config (id used for active state and display number)
 * @param {number} currentStep - Currently active step id
 * @param {Function} onStepChange - (stepId) => void
 * @param {string} [ariaLabel] - Accessible label for the nav (e.g. "Proposal form steps")
 * @param {string} [className] - Optional extra class names for the nav
 */
export default function FormStepNav({ steps = [], currentStep, onStepChange, ariaLabel = 'Form steps', className = '' }) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center gap-2 flex-wrap ${className}`.trim()}
    >
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStepChange(s.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              currentStep === s.id
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200 ring-2 ring-primary-500/50'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-current/20 text-xs tabular-nums">
              {s.id}
            </span>
            <span className="hidden sm:inline -ms-2">{s.label}</span>
          </button>
          {i < steps.length - 1 && (
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>→</span>
          )}
        </div>
      ))}
    </nav>
  );
}
