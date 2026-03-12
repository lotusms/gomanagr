import { useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HiX, HiExclamation } from 'react-icons/hi';
import { PrimaryButton, SecondaryButton } from './buttons';

/**
 * Shown when user clicks Previous/Next on an edit form that has unsaved changes.
 * Options: Save and go to next/previous item, Discard and go, or Cancel (stay).
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose - Cancel / Stay
 * @param {() => void} onSaveAndGo - Save from form then parent should navigate
 * @param {() => void} onDiscardAndGo - Discard and navigate
 * @param {string} direction - 'next' | 'previous'
 * @param {string} itemNameSingular - e.g. "contract", "invoice"
 */
export default function UnsavedChangesPaginationDialog({
  isOpen,
  onClose,
  onSaveAndGo,
  onDiscardAndGo,
  direction = 'next',
  itemNameSingular = 'item',
}) {
  const isNext = direction === 'next';
  const goLabel = isNext ? `Save and go to next ${itemNameSingular}` : `Save and go to previous ${itemNameSingular}`;
  const discardLabel = isNext ? `Discard and go to next` : `Discard and go to previous`;

  const handleSaveAndGo = useCallback(() => {
    onClose();
    onSaveAndGo?.();
  }, [onClose, onSaveAndGo]);

  const handleDiscardAndGo = useCallback(() => {
    onClose();
    onDiscardAndGo?.();
  }, [onClose, onDiscardAndGo]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-5xl p-0 data-[state=open]:animate-[scaleIn_200ms_ease-out] data-[state=closed]:animate-[scaleOut_200ms_ease-out] focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
                <HiExclamation className="size-10 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 ml-4">
                <Dialog.Title className="text-xl font-bold text-amber-800 dark:text-amber-200">
                  Unsaved changes
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
              You have unsaved changes. Save before leaving to keep them, or discard to load the {isNext ? 'next' : 'previous'} {itemNameSingular} without saving.
            </Dialog.Description>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <SecondaryButton type="button" onClick={onClose} className="px-5 py-2.5">
                Cancel
              </SecondaryButton>
              <SecondaryButton type="button" onClick={handleDiscardAndGo} className="px-5 py-2.5">
                {discardLabel}
              </SecondaryButton>
              <PrimaryButton type="button" onClick={handleSaveAndGo} className="px-5 py-2.5 order-first sm:order-none">
                {goLabel}
              </PrimaryButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
