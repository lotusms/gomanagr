import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiX } from 'react-icons/hi';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import InputField from '@/components/ui/InputField';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';
import TextareaInput from '@/components/ui/TextareaInput';
import { unformatPhone } from '@/utils/formatPhone';

/**
 * Dialog to request a consultation with LOTUS Marketing Solutions for a website and GoManagr integration.
 * Uses a plain div-based modal (no Radix) for reliable Safari display.
 */
export default function WebsiteConsultationDialog({ open, onClose, onSuccess, defaultEmail = '', defaultName = '', defaultCompany = '' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(defaultName || '');
      setEmail(defaultEmail || '');
      setCompany(defaultCompany || '');
      setPhone('');
      setMessage('');
      setSubmitted(false);
      setError('');
    }
  }, [open, defaultEmail, defaultName, defaultCompany]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/website-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), company: company.trim(), phone: unformatPhone(phone) || phone.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError('Failed to send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="website-consultation-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        aria-hidden="true"
      />
      {/* Content panel - no transform, flexbox centering only (Safari-safe) */}
      <div
        className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="website-consultation-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Request a website consultation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          LOTUS Marketing Solutions can help you get a website integrated with GoManagr. Submit the form below and we’ll get in touch.
        </p>

        {submitted ? (
          <div className="py-4 text-center">
            <p className="text-green-600 dark:text-green-400 font-medium">Request sent successfully.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We’ll be in touch soon.</p>
            <SecondaryButton className="mt-4" onClick={onClose}>
              Close
            </SecondaryButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="consult-name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                variant="light"
              />
              <InputField
                id="consult-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                variant="light"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="consult-company"
                label="Company / Organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                variant="light"
              />
              <PhoneNumberInput
                id="consult-phone"
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="(717) 123-4567"
                variant="light"
              />
            </div>
            <TextareaInput
              id="consult-message"
              label="Message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your website and integration needs..."
              rows={6}
              variant="light"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send request'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(modal, document.body);
}
