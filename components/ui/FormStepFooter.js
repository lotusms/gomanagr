import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

/**
 * Reusable footer for multi-step forms: Back, Cancel, Next / Submit.
 * Use inside a <form>; the primary action is Next (when not on last step) or Submit (on last step).
 *
 * @param {number} step - Current step (1-based)
 * @param {number} totalSteps - Total number of steps
 * @param {Function} onBack - Called when Back is clicked
 * @param {Function} onCancel - Called when Cancel is clicked
 * @param {Function} onNext - Called when Next is clicked
 * @param {string} submitLabel - Label for the submit button (e.g. 'Add proposal', 'Update invoice')
 * @param {boolean} [saving] - Show loading state and disable actions
 * @param {boolean} [submitDisabled] - Extra disable for submit (e.g. when required field missing)
 * @param {string} [className] - Optional extra class names for the wrapper
 */
export default function FormStepFooter({
  step,
  totalSteps,
  onBack,
  onCancel,
  onNext,
  submitLabel,
  saving = false,
  submitDisabled = false,
  className = '',
}) {
  const isLastStep = step >= totalSteps;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-700 ${className}`.trim()}
    >
      <div className="flex gap-2">
        {step > 1 && (
          <SecondaryButton type="button" onClick={onBack}>
            Back
          </SecondaryButton>
        )}
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
      </div>
      <div className="flex gap-2">
        {!isLastStep ? (
          <PrimaryButton type="button" onClick={onNext}>
            Next
          </PrimaryButton>
        ) : (
          <PrimaryButton type="submit" disabled={saving || submitDisabled}>
            {saving ? 'Saving...' : submitLabel}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
