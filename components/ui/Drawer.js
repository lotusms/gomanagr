import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiX } from 'react-icons/hi';

/**
 * Drawer that slides in from the right. Covers ~75% of viewport by default.
 * Renders via portal so it stacks above the dashboard header.
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {React.ReactNode} children
 * @param {string} [title] - Optional title in the drawer header
 * @param {string} [className] - Extra classes for the panel body
 * @param {string} [width] - Width of the panel (default: 75vw)
 */
export default function Drawer({ isOpen, onClose, children, title, className = '', width = '75vw' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const drawer = (
    <div className="fixed inset-0 z-[100] flex" aria-modal="true" role="dialog">
      {/* Overlay */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition-opacity"
        aria-label="Close"
      />
      {/* Panel */}
      <div
        className="relative ml-auto h-full flex flex-col bg-white shadow-xl animate-drawer-in"
        style={{ width }}
      >
        <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b border-gray-200">
          {title != null && title !== '' ? (
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors -mr-2"
            aria-label="Close"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        <div className={`flex-1 overflow-auto ${className}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : null;
}
