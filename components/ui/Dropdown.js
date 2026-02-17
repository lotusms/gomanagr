import { useState, useRef, useEffect, useMemo } from 'react';
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
 * @param {boolean} props.required - Whether field is required
 * @param {boolean} props.searchable - Whether to show search field (default: true if options.length > 10)
 * @param {number} props.searchThreshold - Show search when options exceed this count (default: 10)
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const searchInputRef = useRef(null);

  // Determine if search should be shown
  const showSearch = searchable !== undefined ? searchable : options.length > searchThreshold;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      const optionLabel = typeof option === 'object' ? option.label : option;
      return String(optionLabel).toLowerCase().includes(query);
    });
  }, [options, searchQuery]);

  // Normalize value for comparison
  const selectValue = value === undefined || value === null || value === '' ? undefined : String(value);

  // Find selected option label
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

  // Close popup when clicking outside
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
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when popup opens
      if (showSearch && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, showSearch]);

  // Close on escape key
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
          <span className={selectedLabel ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
            {selectedLabel || placeholder}
          </span>
          <HiChevronDown
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && !disabled && (
          <div
            ref={popupRef}
            className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-full w-full"
            style={{ top: '100%', left: 0 }}
          >
            {/* Search field */}
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

            {/* Options list */}
            <div className="max-h-[300px] overflow-y-auto">
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
                        {isSelected && (
                          <HiCheck className="w-4 h-4 ml-2 flex-shrink-0" />
                        )}
                        {isAssigned && !isSelected && (
                          <span className="text-xs text-primary-600 ml-2">(Assigned)</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
