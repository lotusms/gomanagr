import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronDown, HiSearch, HiX, HiCheck } from 'react-icons/hi';
import {
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_BASE,
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_LIGHT_DEFAULT,
  FORM_CONTROL_LIGHT_LABEL,
} from './formControlStyles';

/**
 * Searchable multiselect dropdown. Shows selected items as chips or summary in trigger;
 * panel has search input and checkbox list.
 *
 * @param {string} id
 * @param {string} [label]
 * @param {Array<{value: string, label: string}>} options
 * @param {string[]} value - Selected option values
 * @param {Function} onChange - (values: string[]) => void
 * @param {string} [placeholder='Select...']
 * @param {boolean} [required]
 * @param {string} [error]
 * @param {boolean} [disabled]
 */
export default function SearchableMultiselect({
  id,
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  required = false,
  error,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const [popupMaxHeight, setPopupMaxHeight] = useState(320);
  const [popupRect, setPopupRect] = useState(null);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const searchInputRef = useRef(null);

  const BOTTOM_GAP_PX = 10;
  const MIN_SPACE_BELOW_TO_OPEN_DOWN_PX = 250;
  const usePortal = true;

  const selectedSet = useMemo(() => new Set(Array.isArray(value) ? value.map(String) : []), [value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => String(opt.label || opt.value).toLowerCase().includes(q));
  }, [options, searchQuery]);

  const selectedLabels = useMemo(() => {
    return options
      .filter((o) => selectedSet.has(String(o.value)))
      .map((o) => o.label || o.value);
  }, [options, selectedSet]);

  const triggerLabel = useMemo(() => {
    if (selectedLabels.length === 0) return '';
    if (selectedLabels.length === 1) return selectedLabels[0];
    if (selectedLabels.length === 2) return selectedLabels.join(' and ');
    return `${selectedLabels[0]} and ${selectedLabels.length - 1} other${selectedLabels.length > 2 ? 's' : ''}`;
  }, [selectedLabels]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popupRef.current &&
        !popupRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const updatePopupRect = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupRect({ top: rect.bottom, left: rect.left, width: rect.width, triggerTop: rect.top });
    }
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      updatePopupRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MIN_SPACE_BELOW_TO_OPEN_DOWN_PX;
      setOpenUpward(openUp);
      const maxH = openUp
        ? Math.min(320, rect.top - BOTTOM_GAP_PX)
        : Math.min(320, spaceBelow - 4 - BOTTOM_GAP_PX);
      setPopupMaxHeight(Math.max(120, maxH));
    }
    if (!isOpen && usePortal) setPopupRect(null);
  }, [isOpen, usePortal, updatePopupRect]);

  useEffect(() => {
    if (isOpen && usePortal) {
      const onScrollOrResize = () => updatePopupRect();
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [isOpen, usePortal, updatePopupRect]);

  const toggleOption = (optValue) => {
    const str = String(optValue);
    const next = selectedSet.has(str)
      ? value.filter((v) => String(v) !== str)
      : [...value, str];
    onChange(next);
  };

  const handleTriggerClick = () => {
    if (!disabled) setIsOpen((o) => !o);
  };

  const popupContent = (
    <>
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <HiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <HiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: BOTTOM_GAP_PX }}>
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            {searchQuery ? 'No options found' : 'No options available'}
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const strVal = String(opt.value);
            const checked = selectedSet.has(strVal);
            return (
              <button
                key={strVal}
                type="button"
                onClick={() => toggleOption(opt.value)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                    checked
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-400 dark:border-gray-500'
                  }`}
                >
                  {checked && <HiCheck className="w-3 h-3" />}
                </span>
                <span>{opt.label || opt.value}</span>
              </button>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
          {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={handleTriggerClick}
        disabled={disabled}
        className={`inline-flex items-center justify-between w-full ${FORM_CONTROL_HEIGHT} ${FORM_CONTROL_BASE} ${FORM_CONTROL_FOCUS} ${FORM_CONTROL_LIGHT_DEFAULT} hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border ${
          error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
        } ${isOpen ? 'ring-1 ring-ternary-500 border-ternary-500' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`min-w-0 truncate ${triggerLabel ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          {triggerLabel || placeholder}
        </span>
        <HiChevronDown
          className={`w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && !disabled && !usePortal && (
        <div
          ref={popupRef}
          className="absolute z-[9999] left-0 min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
          style={{
            ...(openUpward ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
            maxHeight: popupMaxHeight,
          }}
        >
          {popupContent}
        </div>
      )}
      {isOpen && !disabled && usePortal && popupRect && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            className="z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-w-0"
            style={{
              position: 'fixed',
              left: popupRect.left,
              width: popupRect.width,
              minWidth: popupRect.width,
              ...(openUpward
                ? { bottom: window.innerHeight - popupRect.triggerTop + 4, maxHeight: popupMaxHeight }
                : { top: popupRect.top + 4, maxHeight: popupMaxHeight }),
            }}
          >
            {popupContent}
          </div>,
          document.body
        )}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
