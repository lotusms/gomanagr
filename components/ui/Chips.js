import * as RadioGroup from '@radix-ui/react-radio-group';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Label from '@radix-ui/react-label';
import { getLabelClasses } from './formControlStyles';

/**
 * Chips Component - Single Select (Radio Group)
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the chip group
 * @param {string} props.label - Label text for the chip group
 * @param {Array<string>} props.options - Array of option values
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onValueChange - Callback when value changes
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.layout - Layout type: 'flex' (default), 'vertical' for full-width stacked buttons, or 'grid' for grid layout
 * @param {string} props.variant - 'dark' (default) or 'light' for light backgrounds
 */
export function ChipsSingle({
  id,
  label,
  options,
  value,
  onValueChange,
  error,
  required = false,
  className = '',
  layout = 'flex',
  variant = 'dark',
}) {
  const isVertical = layout === 'vertical';
  const isGrid = layout === 'grid';
  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const requiredClass = isLight ? 'text-red-500 dark:text-red-400 ml-1' : 'text-red-400 ml-1';
  const errorClass = isLight ? 'mt-2 text-sm text-red-600 dark:text-red-400' : 'mt-2 text-sm text-red-300';
  
  const getRootClassName = () => {
    if (isVertical) return 'space-y-3';
    if (isGrid) return 'grid grid-cols-1 md:grid-cols-2 gap-2';
    return 'flex flex-wrap gap-3';
  };
  
  return (
    <div className={className}>
      <Label.Root
        htmlFor={id}
        className={labelClass}
      >
        {label}
        {required && <span className={requiredClass}>*</span>}
      </Label.Root>
      <RadioGroup.Root
        id={id}
        value={value || ''}
        onValueChange={onValueChange}
        className={getRootClassName()}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option}
            value={option}
            className={`
              ${isVertical ? 'w-full px-6 py-4' : 'px-4 py-2'} rounded-lg font-medium transition cursor-pointer text-left
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-primary-900 dark:focus:ring-offset-gray-900
              ${
                value === option
                  ? 'bg-primary-600 text-white border-2 border-primary-400'
                  : isLight
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20'
              }
            `}
          >
            <div className={isVertical ? 'flex items-center justify-between' : ''}>
              <span>{option}</span>
              {isVertical && value === option && (
                <span className="text-xl">✓</span>
              )}
            </div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {error && (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Chips Component - Multi Select (Toggle Group)
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the chip group
 * @param {string} props.label - Label text for the chip group
 * @param {Array<string>} props.options - Array of option values
 * @param {Array<string>} props.value - Currently selected values array
 * @param {Function} props.onValueChange - Callback when values change
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.layout - Layout type: 'grid' or 'flex' (default: 'flex')
 * @param {string} props.variant - 'dark' (default) or 'light' for light backgrounds
 * @param {Object} props.optionData - Optional map of option values to objects with avatar, name, etc.
 * @param {Function} props.renderOption - Optional custom render function for options
 */
export function ChipsMulti({
  id,
  label,
  options,
  value = [],
  onValueChange,
  error,
  required = false,
  className = '',
  layout = 'flex',
  variant = 'dark',
  optionData = {},
  renderOption,
}) {
  const handleValueChange = (newValue) => {
    if (onValueChange) onValueChange(newValue);
  };

  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const requiredClass = isLight ? 'text-red-500 dark:text-red-400 ml-1' : 'text-red-400 ml-1';
  const unselectedClass = isLight
    ? 'bg-primary-50 dark:bg-gray-700 text-primary-800 dark:text-gray-200 border border-primary-200 dark:border-gray-600 hover:bg-primary-100 dark:hover:bg-gray-600 hover:border-primary-300 dark:hover:border-gray-500'
    : 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20';
  const selectedClass = isLight
    ? 'bg-primary-600 text-white border border-primary-600'
    : 'bg-primary-600 text-white border-2 border-primary-400';
  const errorClass = isLight ? 'mt-2 text-sm text-red-600 dark:text-red-400' : 'mt-2 text-sm text-red-300';
  const chipPadding = isLight ? 'px-3 py-0.5 text-sm rounded-full' : 'px-4 py-3 rounded-lg';
  const checkSize = isLight ? 'text-sm' : 'text-xl';

  return (
    <div className={className}>
      <Label.Root htmlFor={id} className={labelClass}>
        {label}
        {required && <span className={requiredClass}>*</span>}
      </Label.Root>
      <ToggleGroup.Root
        id={id}
        type="multiple"
        value={value || []}
        onValueChange={handleValueChange}
        className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => {
          const data = optionData[option] || {};
          const isSelected = value?.includes(option);
          
          return (
            <ToggleGroup.Item
              key={option}
              value={option}
              className={`
                ${chipPadding} font-medium text-left transition cursor-pointer flex items-center gap-2
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent
                ${isSelected ? selectedClass : unselectedClass}
              `}
            >
              {renderOption ? (
                renderOption(option, isSelected, data)
              ) : (
                <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {data.avatar && (
                      <div className="flex-shrink-0">
                        {typeof data.avatar === 'string' ? (
                          <img 
                            src={data.avatar} 
                            alt="" 
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          data.avatar
                        )}
                      </div>
                    )}
                    <span className="truncate">{option}</span>
                  </div>
                  {isSelected && <span className={`${checkSize} flex-shrink-0`}>✓</span>}
                </div>
              )}
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup.Root>
      {error && (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
