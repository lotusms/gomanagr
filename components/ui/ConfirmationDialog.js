import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HiX, HiExclamationCircle } from 'react-icons/hi';
import { PrimaryButton, SecondaryButton } from './buttons';
import InputField from './InputField';

/**
 * Reusable Confirmation Dialog Component
 * Requires user to type a confirmation word (default: "delete") to enable the confirm button
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {() => void} props.onClose - Callback when dialog is closed (canceled)
 * @param {() => void} props.onConfirm - Callback when user confirms the action
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Warning message to display
 * @param {string} props.confirmText - Text for the confirm button (default: "Delete")
 * @param {string} props.cancelText - Text for the cancel button (default: "Cancel")
 * @param {string} props.confirmationWord - Word user must type to confirm (default: "delete")
 * @param {string} props.confirmationLabel - Label for the confirmation input (default: "Type '{confirmationWord}' to confirm")
 * @param {string} props.variant - 'danger' (default) for destructive actions, 'warning' for warnings
 */
export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmationWord = 'delete',
  confirmationLabel,
  variant = 'danger',
}) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [error, setError] = useState('');

  // Reset confirmation input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (confirmationInput.toLowerCase().trim() !== confirmationWord.toLowerCase()) {
      setError(`Please type "${confirmationWord}" to confirm`);
      return;
    }
    onConfirm();
    setConfirmationInput('');
    setError('');
  };

  const handleCancel = () => {
    setConfirmationInput('');
    setError('');
    onClose();
  };

  const isConfirmEnabled = confirmationInput.toLowerCase().trim() === confirmationWord.toLowerCase();

  const variantStyles = {
    danger: {
      icon: 'text-red-400',
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 border-red-800',
    },
    warning: {
      icon: 'text-amber-600',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 border-amber-800',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[201] w-full max-w-lg p-0 data-[state=open]:animate-[scaleIn_200ms_ease-out] data-[state=closed]:animate-[scaleOut_200ms_ease-out] focus:outline-none overflow-hidden border border-gray-100">
          {/* Header section with colored background */}
          <div className={`px-6 pt-6 pb-5 ${variant === 'danger' ? 'bg-gradient-to-br from-red-50 to-red-100/50' : 'bg-gradient-to-br from-amber-50 to-amber-100/50'}`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center`}>
                <HiExclamationCircle className={`size-10 ${styles.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-2xl font-bold text-gray-900 leading-tight">
                  {title}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-all duration-200"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content section */}
          <div className="px-6 py-6 bg-white">
            <Dialog.Description className="text-sm text-gray-600 leading-relaxed mb-4 text-center">
              {message}
            </Dialog.Description>
            <div className="mb-6">
              <InputField
                id="confirmation-input"
                label={confirmationLabel || `Type "${confirmationWord}" to confirm`}
                value={confirmationInput}
                onChange={(e) => {
                  setConfirmationInput(e.target.value);
                  setError('');
                }}
                placeholder={confirmationWord}
                error={error}
                variant="light"
                inputProps={{
                  autoFocus: true,
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' && isConfirmEnabled) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  },
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <SecondaryButton 
                onClick={handleCancel} 
                className="px-6 py-2.5 font-medium"
              >
                {cancelText}
              </SecondaryButton>
              <PrimaryButton
                onClick={handleConfirm}
                disabled={!isConfirmEnabled}
                className={`px-6 py-2.5 font-semibold transition-all duration-200 ${
                  !isConfirmEnabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : `${styles.confirmButton} shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]`
                }`}
              >
                {confirmText}
              </PrimaryButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
