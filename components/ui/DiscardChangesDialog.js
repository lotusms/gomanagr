import { useCallback, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HiX, HiExclamation } from 'react-icons/hi';
import { PrimaryButton, SecondaryButton } from './buttons';

/**
 * Simple confirmation when user tries to cancel with unsaved changes.
 * No typing required — "Stay" keeps the form open, "Discard" calls onConfirm (then parent should run onCancel).
 *
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {() => void} onClose - Called when user clicks Stay or closes (keep form open)
 * @param {() => void} onConfirm - Called when user clicks Discard (parent should then call onCancel)
 * @param {string} [title] - Dialog title (default: "Discard changes?")
 * @param {string} [message] - Message (default: "You have unsaved changes. If you cancel, they will be lost.")
 * @param {string} [stayText] - Stay button label (default: "Stay")
 * @param {string} [discardText] - Discard button label (default: "Discard")
 */
export default function DiscardChangesDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Discard changes?',
  message = 'You have unsaved changes. If you cancel, they will be lost.',
  stayText = 'Stay',
  discardText = 'Discard',
}) {
  const handleDiscard = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-md p-0 data-[state=open]:animate-[scaleIn_200ms_ease-out] data-[state=closed]:animate-[scaleOut_200ms_ease-out] focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
                <HiExclamation className="size-10 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 ml-4">
                <Dialog.Title className="text-xl font-bold text-amber-800 dark:text-amber-200">
                  {title}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div className="px-6 py-5 bg-white dark:bg-gray-800">
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              {message}
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <SecondaryButton type="button" onClick={handleDiscard} className="px-5 py-2.5">
                {discardText}
              </SecondaryButton>
              <PrimaryButton type="button" onClick={onClose} className="px-5 py-2.5" autoFocus>
                {stayText}
              </PrimaryButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Hook for forms that have their own Cancel button (not FormStepFooter).
 * When user clicks Cancel and hasChanges is true, shows DiscardChangesDialog; otherwise calls onCancel.
 * @param {() => void} onCancel - Parent's cancel handler (navigate away, close drawer, etc.)
 * @param {boolean} hasChanges - Whether the form has unsaved changes
 * @returns {{ handleCancel: () => void, discardDialog: React.ReactNode }}
 */
export function useCancelWithConfirm(onCancel, hasChanges) {
  const [showDialog, setShowDialog] = useState(false);
  const handleCancel = useCallback(() => {
    if (hasChanges) setShowDialog(true);
    else onCancel?.();
  }, [hasChanges, onCancel]);
  const handleConfirmDiscard = useCallback(() => {
    setShowDialog(false);
    onCancel?.();
  }, [onCancel]);
  const discardDialog = (
    <DiscardChangesDialog
      isOpen={showDialog}
      onClose={() => setShowDialog(false)}
      onConfirm={handleConfirmDiscard}
    />
  );
  return { handleCancel, discardDialog };
}
