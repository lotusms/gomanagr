import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_OFFSET = 6;

/**
 * Shows content in a tooltip on hover. Renders in a portal with high z-index so it
 * is not clipped by overflow. Use for truncated text to reveal full label.
 * @param {string} content - Full text to show in the tooltip
 * @param {React.ReactNode} children - Trigger element (e.g. truncated span)
 * @param {string} placement - 'top' | 'bottom' (default 'top')
 */
export default function Tooltip({ content, children, placement = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left + rect.width / 2,
        top: placement === 'top' ? rect.top : rect.bottom,
      });
    }
    setVisible(true);
  };

  const handleMouseLeave = () => setVisible(false);

  if (!content) return children;

  const tooltipStyle = {
    left: coords.left,
    transform: 'translateX(-50%)',
    ...(placement === 'top'
      ? { top: coords.top - TOOLTIP_OFFSET, transform: 'translate(-50%, -100%)' }
      : { top: coords.top + TOOLTIP_OFFSET }),
  };

  const tooltipEl = visible && typeof document !== 'undefined' && (
    <span
      className="fixed px-2 py-1.5 text-xs font-medium text-white bg-gray-900 rounded shadow-lg max-w-xs whitespace-pre-line text-left pointer-events-none z-[9999]"
      style={tooltipStyle}
      role="tooltip"
    >
      {content}
    </span>
  );

  return (
    <div
      ref={triggerRef}
      className="relative inline-block min-w-0 max-w-full w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {typeof document !== 'undefined' && tooltipEl && createPortal(tooltipEl, document.body)}
    </div>
  );
}
