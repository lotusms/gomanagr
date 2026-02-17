import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from './formControlStyles';

/**
 * Toggle Component - Binary choice toggle using Radix UI ToggleGroup
 * Perfect for switching between two options (e.g., Cards vs Tables)
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the toggle group
 * @param {string} props.label - Label text for the toggle
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onValueChange - Callback when value changes (receives new value or empty string)
 * @param {string} props.option1 - First option value
 * @param {string} props.option1Label - First option label
 * @param {string} props.option2 - Second option value
 * @param {string} props.option2Label - Second option label
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the toggle is disabled
 * @param {string} props.variant - 'dark' (default) or 'light' for light backgrounds
 */
export default function Toggle({
  id,
  label,
  value,
  onValueChange,
  option1,
  option1Label,
  option2,
  option2Label,
  error,
  required = false,
  className = '',
  disabled = false,
  variant = 'light',
}) {
  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const requiredClass = isLight ? 'text-red-500 dark:text-red-400 ml-1' : 'text-red-400 ml-1';
  const errorClass = isLight ? 'mt-2 text-sm text-red-600 dark:text-red-400' : 'mt-2 text-sm text-red-300';

  const handleValueChange = (newValue) => {
    // ToggleGroup can return empty string when clicking the same option
    // We prevent that and ensure a value is always selected (default to option1)
    const finalValue = newValue || option1;
    if (onValueChange) {
      onValueChange(finalValue);
    }
  };

  // Ensure we always have a valid value, defaulting to option1 (cards)
  const currentValue = value && (value === option1 || value === option2) ? value : option1;

  return (
    <div className={className}>
      {label && (
        <Label.Root
          htmlFor={id}
          className={`${labelClass} dark:text-gray-200`}
        >
          {label}
          {required && <span className={requiredClass}>*</span>}
        </Label.Root>
      )}
      <ToggleGroup.Root
        id={id}
        type="single"
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1 mt-2"
        aria-label={label || 'Toggle option'}
      >
        <ToggleGroup.Item
          value={option1}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              value === option1
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }
          `}
          aria-label={option1Label}
        >
          {option1Label}
        </ToggleGroup.Item>
        <ToggleGroup.Item
          value={option2}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              value === option2
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }
          `}
          aria-label={option2Label}
        >
          {option2Label}
        </ToggleGroup.Item>
      </ToggleGroup.Root>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}
