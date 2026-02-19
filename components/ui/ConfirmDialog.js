import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiX, HiExclamation } from 'react-icons/hi';
import { PrimaryButton, SecondaryButton } from './buttons';

/**
 * Confirmation dialog component
 * @param {boolean} isOpen - Whether dialog is open
 * @param {Function} onClose - Callback when dialog is closed
 * @param {Function} onConfirm - Callback when user confirms
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - "danger" | "warning" | "info" (default: "danger")
 * @param {boolean} loading - Whether action is in progress
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
    },
    warning: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  const dialog = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      {/* Overlay */}
      <button
        type="button"
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        aria-label="Close"
        disabled={loading}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <HiExclamation className={`w-6 h-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <HiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Processing...' : confirmText}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : null;
}
