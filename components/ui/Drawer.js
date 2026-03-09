import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HiX } from 'react-icons/hi';

const DRAWER_OUT_MS = 200;

/**
 * Drawer that slides in from the right. Covers ~75% of viewport by default.
 * Animates out (slides back) when closing. Renders via portal so it stacks above the dashboard header.
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
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef(null);
  const prevOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const closeInitiatedByUsRef = useRef(false);
  onCloseRef.current = onClose;
  const isNested = zIndex > 100;

  // When opening: reset closing state synchronously so the drawer shows immediately
  useLayoutEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      closeInitiatedByUsRef.current = false;
      prevOpenRef.current = true;
      setIsClosing(false);
    }
  }, [isOpen]);

  // When parent sets isOpen to false, run close animation only if we didn't initiate it (e.g. user clicked X/overlay)
  useEffect(() => {
    if (closeInitiatedByUsRef.current && !isOpen) {
      closeInitiatedByUsRef.current = false;
      prevOpenRef.current = false;
      return;
    }
    if (prevOpenRef.current && !isOpen && !isClosing) {
      prevOpenRef.current = false;
      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        setIsClosing(false);
      }, DRAWER_OUT_MS);
    }
  }, [isOpen, isClosing]);

  useEffect(() => {
    if (!isOpen && !isClosing) return;
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (closeTimeoutRef.current) return; // already closing
      closeInitiatedByUsRef.current = true;
      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        setIsClosing(false);
        onCloseRef.current?.();
      }, DRAWER_OUT_MS);
    };
    document.addEventListener('keydown', handleEscape, isNested);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape, isNested);
      document.body.style.overflow = '';
      // Don't clear closeTimeoutRef here—closing animation timeout is cleared when it fires or when drawer reopens
    };
  }, [isOpen, isClosing, isNested]);

  const handleClose = () => {
    if (isClosing) return;
    closeInitiatedByUsRef.current = true;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsClosing(false);
      onCloseRef.current?.();
    }, DRAWER_OUT_MS);
  };

  if (!isOpen && !isClosing) return null;

  const drawerId = `drawer-${Math.random().toString(36).substr(2, 9)}`;
  const panelAnimClass = isClosing ? 'animate-drawer-out' : 'animate-drawer-in';
  const overlayOpacityClass = isClosing ? 'opacity-0' : 'opacity-100';

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
            if (closeOnOverlayClick) handleClose();
          }}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${overlayOpacityClass}`}
          aria-label={closeOnOverlayClick ? 'Close' : undefined}
        />
        {/* Panel */}
        <div
          id={drawerId}
          className={`relative ml-auto h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl ${panelAnimClass}`}
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
                handleClose();
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
