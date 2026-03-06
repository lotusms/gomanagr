import { useState } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import DiscardChangesDialog from '@/components/ui/DiscardChangesDialog';

/**
 * Reusable footer for multi-step forms: Back, Cancel, Next / Submit.
 * Use inside a <form>. On the last step, primary action is Submit (only on button click if onSubmitClick is provided).
 * When hasChanges is true and user clicks Cancel, a confirmation dialog is shown before calling onCancel.
 *
 * @param {number} step - Current step (1-based)
 * @param {number} totalSteps - Total number of steps
 * @param {Function} onBack - Called when Back is clicked
 * @param {Function} onCancel - Called when Cancel is clicked (or when user confirms discard)
 * @param {Function} onNext - Called when Next is clicked
 * @param {string} submitLabel - Label for the submit button (e.g. 'Add proposal', 'Update invoice')
 * @param {Function} [onSubmitClick] - When provided and on last step, submit is type="button" and only this click submits (prevents Enter from submitting)
 * @param {boolean} [saving] - Show loading state and disable actions
 * @param {boolean} [submitDisabled] - Extra disable for submit (e.g. when required field missing)
 * @param {boolean} [hasChanges] - When true, clicking Cancel shows a "Discard changes?" dialog first
 * @param {string} [secondarySubmitLabel] - Optional second button on last step (e.g. 'Save and Send')
 * @param {Function} [onSecondarySubmitClick] - Called when second button is clicked
 * @param {boolean} [secondarySubmitDisabled] - Disable the second button (e.g. when no client email)
 * @param {React.ReactNode} [noClientEmailWarning] - When secondary is disabled, show this to the left of the buttons (e.g. "(no email exists for this client)")
 * @param {string} [className] - Optional extra class names for the wrapper
 */
export default function FormStepFooter({
  step,
  totalSteps,
  onBack,
  onCancel,
  onNext,
  submitLabel,
  onSubmitClick,
  saving = false,
  submitDisabled = false,
  hasChanges = false,
  secondarySubmitLabel,
  onSecondarySubmitClick,
  secondarySubmitDisabled = false,
  noClientEmailWarning,
  className = '',
}) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const isLastStep = step >= totalSteps;
  const useButtonSubmit = isLastStep && typeof onSubmitClick === 'function';

  const handleCancelClick = () => {
    if (hasChanges) setShowDiscardDialog(true);
    else onCancel?.();
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    onCancel?.();
  };

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 pt-2 ${className}`.trim()}
      >
        <div className="flex gap-2">
          {step > 1 && (
            <SecondaryButton type="button" onClick={onBack}>
              Back
            </SecondaryButton>
          )}
          <SecondaryButton type="button" onClick={handleCancelClick} disabled={saving}>
            Cancel
          </SecondaryButton>
        </div>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {isLastStep && secondarySubmitDisabled && noClientEmailWarning != null && (
          <span className="text-sm text-amber-600 dark:text-amber-400">
            {noClientEmailWarning}
          </span>
        )}
        {!isLastStep ? (
          <PrimaryButton type="button" onClick={onNext}>
            Next
          </PrimaryButton>
        ) : (
          <>
            {isLastStep && secondarySubmitLabel && onSecondarySubmitClick && (
              <PrimaryButton
                type="button"
                disabled={saving || secondarySubmitDisabled}
                onClick={onSecondarySubmitClick}
              >
                {secondarySubmitLabel}
              </PrimaryButton>
            )}
            {useButtonSubmit ? (
              <PrimaryButton
                type="button"
                disabled={saving || submitDisabled}
                onClick={onSubmitClick}
              >
                {saving ? 'Saving...' : submitLabel}
              </PrimaryButton>
            ) : (
              <PrimaryButton type="submit" disabled={saving || submitDisabled}>
                {saving ? 'Saving...' : submitLabel}
              </PrimaryButton>
            )}
          </>
        )}
      </div>
      </div>
      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        onConfirm={handleConfirmDiscard}
      />
    </>
  );
}
