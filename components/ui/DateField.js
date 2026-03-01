import { useState, useRef, useEffect } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiCalendar, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { getInputClasses, getLabelClasses } from './formControlStyles';
import { formatDate, parseFormattedDate } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';

/**
 * DateField Component - Custom date picker with calendar popup
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the field
 * @param {string} props.label - Label text
 * @param {string} props.value - Date value in YYYY-MM-DD format
 * @param {Function} props.onChange - Callback when date changes (receives event object)
 * @param {Function} props.onBlur - Callback when field loses focus
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.error - Error message to display
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {string} props.variant - 'dark' or 'light'
 * @param {string} props.min - Minimum date in YYYY-MM-DD format
 * @param {string} props.max - Maximum date in YYYY-MM-DD format
 * @param {string} props.timezone - User's timezone (e.g., 'America/New_York')
 * @param {string} props.dateFormat - User's date format preference (e.g., 'MM/DD/YYYY')
 */
export default function DateField({
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
  min,
  max,
  timezone: timezoneProp,
  dateFormat: dateFormatProp,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = dateFormatProp ?? account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = timezoneProp ?? account?.timezone ?? 'UTC';

  const [isFocused, setIsFocused] = useState(false);
  const [localInput, setLocalInput] = useState('');

  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    const normalized = dateString.split('T')[0];
    const parts = normalized.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const normalizeDateValue = (dateValue) => {
    if (!dateValue) return '';
    return dateValue.split('T')[0];
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const normalizedValue = normalizeDateValue(value);
      const date = parseLocalDate(normalizedValue);
      if (date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const inputClass = getInputClasses(variant, !!error);
  const errorTextClass = isLight ? 'mt-1 text-sm text-red-600 dark:text-red-400' : 'mt-1 text-sm text-red-300';

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

  useEffect(() => {
    if (value) {
      const normalizedValue = normalizeDateValue(value);
      const date = parseLocalDate(normalizedValue);
      if (date) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
  }, [value]);

  // When value changes while focused (e.g. calendar selection), sync display
  useEffect(() => {
    if (isFocused && value) {
      setLocalInput(formatDate(normalizeDateValue(value), dateFormat, timezone));
    }
  }, [value, isFocused, dateFormat, timezone]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const todayInTimezone = new Date().toLocaleDateString('en-CA', { timeZone: timezone });

  const isDateDisabled = (date) => {
    const dateStr = formatDateForInput(date);
    const normalizedValue = normalizeDateValue(value);
    if (normalizedValue && normalizedValue === dateStr) return false;
    const minDate = min || todayInTimezone;
    if (dateStr < minDate) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = formatDateForInput(selectedDate);
    
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: id,
          value: dateStr,
        },
        currentTarget: {
          name: id,
          value: dateStr,
        },
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const handleCalendarButtonClick = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleInputChange = (e) => {
    setLocalInput(e.target.value);
  };

  const handleInputFocus = () => {
    setLocalInput(value ? formatDate(normalizeDateValue(value), dateFormat, timezone) : '');
    setIsFocused(true);
  };

  const handleInputBlur = (e) => {
    const parsed = parseFormattedDate(localInput, dateFormat, timezone);
    if (onChange) {
      if (parsed) {
        onChange({
          target: { name: id, value: parsed },
          currentTarget: { name: id, value: parsed },
        });
      } else if (!localInput.trim()) {
        onChange({
          target: { name: id, value: '' },
          currentTarget: { name: id, value: '' },
        });
      }
    }
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const displayValue = isFocused
    ? localInput
    : (value ? formatDate(normalizeDateValue(value), dateFormat, timezone) : '');

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const selectedDate = value ? parseLocalDate(value) : null;
  const today = todayInTimezone ? parseLocalDate(todayInTimezone) : null;

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
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            required={required}
            disabled={disabled}
            placeholder={dateFormat}
            className={`${inputClass} pr-10`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleCalendarButtonClick}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Open calendar"
          >
            <HiCalendar className="w-5 h-5" />
          </button>
        </div>

        {isOpen && !disabled && (
          <div
            ref={popupRef}
            className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[280px]"
            style={{ top: 'calc(100% + 4px)', left: 0 }}
          >
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-4 p-2 bg-primary-50 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                aria-label="Previous month"
              >
                <HiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                aria-label="Next month"
              >
                <HiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-2 px-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 px-2 pb-2">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const dateStr = formatDateForInput(date);
                const normalizedValue = normalizeDateValue(value);
                const isSelected = normalizedValue && normalizedValue === dateStr;
                const isToday = formatDateForInput(today) === dateStr;
                const isDisabled = isDateDisabled(date);
                const isTodayAndSelected = isSelected && isToday;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    disabled={isDisabled}
                    className={`
                      aspect-square text-sm rounded-full transition-colors
                      ${isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : isTodayAndSelected || isSelected
                        ? 'bg-secondary-500/10 dark:bg-secondary-900/40 text-secondary-700 dark:text-secondary-300 font-semibold border border-secondary-500 dark:border-secondary-600'
                        : isToday
                        ? 'bg-primary-600 text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {day}
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
