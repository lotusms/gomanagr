import { useState, useRef, cloneElement, Children } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_OFFSET = 6;

/**
 * Shows content in a tooltip on hover. Renders in a portal with high z-index so it
 * is not clipped by overflow. Use for truncated text to reveal full label.
 * When children is a single element, hover is attached to that element (no wrapper div).
 * @param {string} content - Full text to show in the tooltip
 * @param {React.ReactNode} children - Trigger element (e.g. button or span)
 * @param {string} placement - 'top' | 'bottom' (default 'top')
 * @param {string} [wrapperClassName] - Optional; if set, wraps child in a div with this class (for layout). Omit to attach to child only (no wrapper).
 */
export default function Tooltip({ content, children, placement = 'top', wrapperClassName = '' }) {
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

  const child = Children.only(children);
  const mergedRef = (el) => {
    triggerRef.current = el;
    if (child?.ref) {
      if (typeof child.ref === 'function') child.ref(el);
      else child.ref.current = el;
    }
  };
  const trigger = cloneElement(child, {
    ref: mergedRef,
    onMouseEnter: (e) => {
      handleMouseEnter();
      child.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e) => {
      handleMouseLeave();
      child.props.onMouseLeave?.(e);
    },
  });

  if (wrapperClassName) {
    return (
      <div
        ref={triggerRef}
        className={`relative inline-block min-w-0 max-w-full w-full ${wrapperClassName}`.trim()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {typeof document !== 'undefined' && tooltipEl && createPortal(tooltipEl, document.body)}
      </div>
    );
  }

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' && tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  );
}
