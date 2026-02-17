import { useState, useRef, useEffect, useMemo } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiClock } from 'react-icons/hi';
import { getInputClasses, getLabelClasses } from './formControlStyles';
import { buildTimeSlots, parseHour } from '@/components/dashboard/scheduleTimeUtils';

/**
 * TimeField Component - Custom time picker with time slot popup
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the field
 * @param {string} props.label - Label text
 * @param {string} props.value - Time value in HH:MM format (24h) or formatted string (12h)
 * @param {Function} props.onChange - Callback when time changes (receives event object)
 * @param {Function} props.onBlur - Callback when field loses focus
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.error - Error message to display
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {string} props.variant - 'dark' or 'light'
 * @param {string} props.businessHoursStart - Business hours start (e.g., '08:00')
 * @param {string} props.businessHoursEnd - Business hours end (e.g., '18:00')
 * @param {string} props.timeFormat - '12h' or '24h'
 * @param {Array} props.options - Array of time slot options with {value, label, disabled}
 * @param {string} props.placeholder - Placeholder text
 */
export default function TimeField({
  id,
  label,
  value = '',
  onChange,
  onBlur,
  required = false,
  error,
  className = '',
  disabled = false,
  variant = 'light',
  businessHoursStart = '08:00',
  businessHoursEnd = '18:00',
  timeFormat = '24h',
  options,
  placeholder = 'Select time...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const scrollRef = useRef(null);

  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const inputClass = getInputClasses(variant, !!error);
  const errorTextClass = isLight ? 'mt-1 text-sm text-red-600 dark:text-red-400' : 'mt-1 text-sm text-red-300';

  // Use provided options or generate time slots
  const timeSlotOptions = useMemo(() => {
    if (options && Array.isArray(options) && options.length > 0) {
      // Options already provided, use them as-is
      return options.map((opt) => {
        if (typeof opt === 'string') {
          return { value: opt, label: opt, disabled: false };
        }
        return opt;
      });
    }
    // Generate time slots if options not provided
    const timeSlots = buildTimeSlots(businessHoursStart, businessHoursEnd, timeFormat);
    return timeSlots.map((slot) => ({
      value: slot,
      label: slot,
      disabled: false,
    }));
  }, [options, businessHoursStart, businessHoursEnd, timeFormat]);

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
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Scroll to selected time when popup opens
  useEffect(() => {
    if (isOpen && scrollRef.current && value) {
      const selectedIndex = timeSlotOptions.findIndex((opt) => opt.value === value);
      if (selectedIndex >= 0) {
        const selectedElement = scrollRef.current.children[selectedIndex];
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  }, [isOpen, value, timeSlotOptions]);

  const formatTimeDisplay = (timeValue) => {
    if (!timeValue) return '';
    return timeValue;
  };

  const handleTimeSelect = (timeValue) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: id,
          value: timeValue,
        },
        currentTarget: {
          name: id,
          value: timeValue,
        },
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const selectedOption = timeSlotOptions.find((opt) => opt.value === value);

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <Label.Root htmlFor={id} className={labelClass}>
          {label}
          {required && <span className={isLight ? 'text-red-500 dark:text-red-400 ml-1' : 'text-red-400 ml-1'}>*</span>}
        </Label.Root>
      )}
      <div className="relative">
        <div className="relative">
          <input
            id={id}
            type="text"
            value={formatTimeDisplay(value)}
            onChange={() => {}} // Read-only, only selectable via popup
            onBlur={onBlur}
            onClick={handleInputClick}
            readOnly
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            className={`${inputClass} pr-10 cursor-pointer`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <button
            type="button"
            onClick={handleInputClick}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Open time picker"
          >
            <HiClock className="w-5 h-5" />
          </button>
        </div>

        {isOpen && !disabled && (
          <div
            ref={popupRef}
            className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px] max-w-[280px]"
            style={{ top: 'calc(100% + 4px)', left: 0 }}
          >
            {/* Time slots list */}
            <div
              ref={scrollRef}
              className="max-h-[300px] overflow-y-auto p-2"
            >
              {timeSlotOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isDisabled = option.disabled;

                return (
                  <button
                    key={option.value || `time-${index}`}
                    type="button"
                    onClick={() => !isDisabled && handleTimeSelect(option.value)}
                    disabled={isDisabled}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                      ${isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary-600 text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {option.label || option.value}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
