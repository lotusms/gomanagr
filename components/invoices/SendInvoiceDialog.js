/**
 * Dialog to send or resend an invoice (or send a reminder) by email.
 */

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HiX, HiMail } from 'react-icons/hi';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import InputField from '@/components/ui/InputField';

export default function SendInvoiceDialog({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  invoiceTitle,
  invoiceNumber,
  defaultTo = '',
  clientName = '',
  userId,
  organizationId = null,
  isReminder = false,
}) {
  const [email, setEmail] = useState(defaultTo || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultTo || '');
      setError('');
    }
  }, [isOpen, defaultTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = (email || '').trim();
    if (!trimmed) {
      setError('Enter the recipient email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!userId || !invoiceId) {
      setError('Missing invoice or user.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId: organizationId || undefined,
          invoiceId,
          to: trimmed,
          clientName: clientName || undefined,
          isReminder: !!isReminder,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  const title = isReminder ? 'Send reminder' : (invoiceNumber ? `Send invoice ${invoiceNumber}` : 'Send invoice');
  const confirmLabel = isReminder ? 'Send reminder' : 'Send invoice';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-md p-0 data-[state=open]:animate-[scaleIn_200ms_ease-out] data-[state=closed]:animate-[scaleOut_200ms_ease-out] focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <HiMail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                  {title}
                </Dialog.Title>
                {invoiceTitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {invoiceTitle}
                  </p>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="px-6 pb-6">
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
                {error}
              </p>
            )}
            <InputField
              id="send-invoice-email"
              label="Recipient email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="client@example.com"
              variant="light"
              inputProps={{ autoFocus: true }}
            />
            <div className="flex justify-end gap-3 mt-5">
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={sending}>
                {sending ? 'Sending…' : confirmLabel}
              </PrimaryButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
