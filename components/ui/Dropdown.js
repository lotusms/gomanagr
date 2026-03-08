import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronDown, HiCheck, HiSearch, HiX } from 'react-icons/hi';
import {
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_BASE,
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_LIGHT_DEFAULT,
  FORM_CONTROL_LIGHT_LABEL,
} from './formControlStyles';

/**
 * Dropdown Component with optional search functionality
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the dropdown
 * @param {string} props.name - Name attribute
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Callback when value changes (receives event object)
 * @param {Array} props.options - Array of options (strings or {value, label, disabled})
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether dropdown is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text
 * @param {string} [props.sublabel] - Optional hint text below the label
 * @param {boolean} props.required - Whether field is required
 * @param {boolean} props.searchable - Whether to show search field (default: true if options.length > 10)
 * @param {number} props.searchThreshold - Show search when options exceed this count (default: 10)
 * @param {boolean} [props.listGrowsWithContent] - If true, options list has no max-height/scroll; panel and page grow instead
 * @param {boolean} [props.usePortal] - If true, render popup in a portal (e.g. when inside table) to avoid clipping
 */
export default function Dropdown({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  label,
  required = false,
  searchable,
  searchThreshold = 10,
  listGrowsWithContent = false,
  usePortal = false,
  sublabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popupRect, setPopupRect] = useState(null);
  const [openUpward, setOpenUpward] = useState(false);
  const [nonPortalMaxHeight, setNonPortalMaxHeight] = useState(300);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const searchInputRef = useRef(null);

  const BOTTOM_GAP_PX = 10;
  const MIN_SPACE_BELOW_TO_OPEN_DOWN_PX = 250;
  /** Max height of the options list so it scrolls when there are many options */
  const OPTIONS_LIST_MAX_HEIGHT_PX = 280;

  const showSearch = searchable !== undefined ? searchable : options.length > searchThreshold;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      const optionLabel = typeof option === 'object' ? option.label : option;
      return String(optionLabel).toLowerCase().includes(query);
    });
  }, [options, searchQuery]);

  const selectValue = value === undefined || value === null || value === '' ? undefined : String(value);

  const selectedOption = useMemo(() => {
    if (!selectValue) return null;
    return options.find((opt) => {
      const optValue = typeof opt === 'object' ? opt.value : opt;
      return String(optValue) === selectValue;
    });
  }, [options, selectValue]);

  const selectedLabel = selectedOption
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : '';

  const updatePopupRect = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupRect({
        top: rect.bottom,
        triggerTop: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen && usePortal && containerRef.current) {
      updatePopupRect();
      const onScrollOrResize = () => updatePopupRect();
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
    if (!isOpen && usePortal) setPopupRect(null);
  }, [isOpen, usePortal, updatePopupRect]);

  useEffect(() => {
    if (isOpen && !usePortal && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MIN_SPACE_BELOW_TO_OPEN_DOWN_PX;
      setOpenUpward(openUp);
      const maxH = openUp
        ? Math.min(300, rect.top - BOTTOM_GAP_PX)
        : Math.min(300, spaceBelow - 4 - BOTTOM_GAP_PX);
      setNonPortalMaxHeight(Math.max(120, maxH));
    }
  }, [isOpen, usePortal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      if (usePortal) updatePopupRect();
      document.addEventListener('mousedown', handleClickOutside);
      if (showSearch && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, showSearch, usePortal, updatePopupRect]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleValueChange = (newValue) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id,
          value: newValue === undefined || newValue === null || newValue === '' ? undefined : newValue,
        },
        currentTarget: {
          name: name || id,
          value: newValue === undefined || newValue === null || newValue === '' ? undefined : newValue,
        },
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      const opening = !isOpen;
      if (opening && usePortal && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPopupRect({ top: rect.bottom, triggerTop: rect.top, left: rect.left, width: rect.width });
      }
      setIsOpen(!isOpen);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const dropdownPanelContent = (
    <>
      {showSearch && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <HiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search options..."
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      <div
        className={
          listGrowsWithContent
            ? ''
            : 'min-h-0 flex-1 overflow-y-auto overscroll-contain shrink-0'
        }
        style={
          listGrowsWithContent
            ? undefined
            : { maxHeight: OPTIONS_LIST_MAX_HEIGHT_PX, minHeight: 0, paddingBottom: BOTTOM_GAP_PX }
        }
      >
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            {searchQuery ? 'No options found' : 'No options available'}
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            const optionDisabled = typeof option === 'object' ? option.disabled : false;
            const isAssigned = typeof option === 'object' ? option.isAssigned : false;
            const itemValue = optionValue === undefined || optionValue === null ? '' : String(optionValue);
            const isSelected = selectValue === itemValue;
            return (
              <button
                key={itemValue || `opt-${index}`}
                type="button"
                onClick={() => !optionDisabled && handleValueChange(itemValue)}
                disabled={optionDisabled}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${optionDisabled
                    ? isAssigned
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 cursor-not-allowed border-l-2 border-primary-500'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : isSelected
                    ? 'bg-primary-600 text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center justify-between">
                  <span>{optionLabel}</span>
                  {isSelected && <HiCheck className="w-4 h-4 ml-2 flex-shrink-0" />}
                  {isAssigned && !isSelected && (
                    <span className="text-xs text-primary-600 ml-2">(Assigned)</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );

  const popupBaseClass = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700';
  const popupWrapperClassName = `z-[9999] ${popupBaseClass} min-w-full overflow-hidden flex flex-col`;
  const popupPortalClassName = `z-[9999] ${popupBaseClass} overflow-hidden flex flex-col`;
  const VIEWPORT_GAP_TOP_PX = 80;

  const popupWrapperStyle = usePortal && popupRect && typeof window !== 'undefined'
    ? (() => {
        const spaceBelow = window.innerHeight - popupRect.top;
        const portalOpenUpward = spaceBelow < MIN_SPACE_BELOW_TO_OPEN_DOWN_PX;
        const triggerTop = popupRect.triggerTop ?? 0;
        return {
          position: 'fixed',
          left: popupRect.left,
          width: popupRect.width,
          minWidth: popupRect.width,
          ...(portalOpenUpward
            ? {
                bottom: window.innerHeight - triggerTop + 4,
                maxHeight: Math.max(150, triggerTop - 4 - VIEWPORT_GAP_TOP_PX),
              }
            : {
                top: popupRect.top + 4,
                maxHeight: `calc(100vh - ${popupRect.top + 4}px - ${BOTTOM_GAP_PX}px)`,
              }),
        };
      })()
    : {};

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
          {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          name={name}
          onClick={handleTriggerClick}
          disabled={disabled}
          className={`inline-flex items-center justify-between w-full ${FORM_CONTROL_HEIGHT} ${FORM_CONTROL_BASE} ${FORM_CONTROL_FOCUS} ${FORM_CONTROL_LIGHT_DEFAULT} hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
            isOpen ? 'ring-1 ring-ternary-500 border-ternary-500' : ''
          }`}
          aria-label={label || placeholder}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={`min-w-0 truncate ${selectedLabel ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {selectedLabel || placeholder}
          </span>
          <HiChevronDown
            className={`w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && !disabled && !usePortal && (
          <div
            ref={popupRef}
            className={`absolute left-0 ${popupWrapperClassName}`}
            style={{
              ...(openUpward ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
              maxHeight: nonPortalMaxHeight,
            }}
          >
            <div className="flex flex-col min-h-0 overflow-hidden" style={{ maxHeight: nonPortalMaxHeight }}>
              {dropdownPanelContent}
            </div>
          </div>
        )}
      </div>
      {sublabel != null && sublabel !== '' && (value === undefined || value === null || value === '') && (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{sublabel}</p>
      )}
      {isOpen && !disabled && usePortal && popupRect && typeof document !== 'undefined' &&
        createPortal(
          <div ref={popupRef} className={popupPortalClassName} style={popupWrapperStyle}>
            <div className="flex flex-col min-h-0 h-full overflow-hidden">
              {dropdownPanelContent}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
