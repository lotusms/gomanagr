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
 * @param {number} [zIndex] - z-index for the overlay/panel (default 100). Use higher (e.g. 110) for nested drawers.
 * @param {boolean} [closeOnOverlayClick] - If false, clicking the overlay does not call onClose (default true). Use for parent drawers that contain nested drawers so button clicks cannot close the parent.
 */
export default function Drawer({ isOpen, onClose, children, title, className = '', width = '75vw', zIndex = 100, closeOnOverlayClick = true }) {
  const isNested = zIndex > 100;
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      onClose();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    document.addEventListener('keydown', handleEscape, isNested);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape, isNested);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isNested]);

  if (!isOpen) return null;

  const drawerId = `drawer-${Math.random().toString(36).substr(2, 9)}`;

  const drawer = (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          #${drawerId} {
            width: 100%;
          }
          @media (min-width: 768px) {
            #${drawerId} {
              width: ${width};
            }
          }
        `
      }} />
      <div className="fixed inset-0 flex" style={{ zIndex }} aria-modal="true" role="dialog">
        {/* Overlay */}
        <div
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            if (closeOnOverlayClick) onClose();
          }}
          className="absolute inset-0 bg-black/40 transition-opacity"
          aria-label={closeOnOverlayClick ? 'Close' : undefined}
        />
        {/* Panel */}
        <div
          id={drawerId}
          className="relative ml-auto h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl animate-drawer-in"
        >
          <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 bg-slate-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            {title != null && title !== '' ? (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors -mr-2"
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
    </>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : null;
}
