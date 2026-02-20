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
 * @param {string} props.layout - Layout type: 'flex' (default), 'vertical' for full-width stacked buttons, 'grid' for grid layout, or 'grouped' for inline chips with shared borders
 * @param {string} props.variant - 'dark' (default) or 'light' for light backgrounds
 * @param {boolean} props.mini - If true, renders smaller chips with reduced padding and text size
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
  mini = false,
}) {
  const isVertical = layout === 'vertical';
  const isGrid = layout === 'grid';
  const isGrouped = layout === 'grouped';
  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const requiredClass = isLight ? 'text-red-500 dark:text-red-400 ml-1' : 'text-red-400 ml-1';
  const errorClass = isLight ? 'mt-2 text-sm text-red-600 dark:text-red-400' : 'mt-2 text-sm text-red-300';
  
  // Mini variant sizing
  const paddingClass = mini 
    ? (isVertical ? 'px-3 py-2' : 'px-2 py-1')
    : (isVertical ? 'px-6 py-4' : 'px-4 py-2');
  const textSizeClass = mini ? 'text-sm' : 'text-base';
  const gapClass = mini ? 'gap-2' : 'gap-3';
  
  const getRootClassName = () => {
    if (isVertical) return mini ? 'space-y-2' : 'space-y-3';
    if (isGrid) return mini ? 'grid grid-cols-1 md:grid-cols-2 gap-1.5' : 'grid grid-cols-1 md:grid-cols-2 gap-2';
    if (isGrouped) return 'inline-flex';
    return `flex flex-wrap ${gapClass}`;
  };
  
  // Ensure value is valid (matches one of the options), but don't default to first option
  // Only use a value if it's explicitly provided and matches an option
  const validValue = value && options.includes(value) ? value : undefined;
  
  const getChipClassName = (option, index) => {
    const isSelected = validValue === option && validValue !== undefined;
    const isFirst = index === 0;
    const isLast = index === options.length - 1;
    
    // Base classes
    let baseClasses = `${paddingClass} ${textSizeClass} font-medium transition cursor-pointer text-left focus:outline-none`;
    
    // Border radius for grouped layout
    if (isGrouped) {
      if (isFirst && isLast) {
        baseClasses += mini ? ' rounded-md' : ' rounded-lg';
      } else if (isFirst) {
        baseClasses += mini ? ' rounded-l-md rounded-r-none' : ' rounded-l-lg rounded-r-none';
      } else if (isLast) {
        baseClasses += mini ? ' rounded-r-md rounded-l-none' : ' rounded-r-lg rounded-l-none';
      } else {
        baseClasses += ' rounded-none';
      }
    } else {
      baseClasses += mini ? ' rounded-md' : ' rounded-lg';
    }
    
    // Border classes for grouped layout
    if (isGrouped) {
      if (isSelected) {
        baseClasses += ' bg-primary-600 text-white border-2 border-primary-400';
        if (!isFirst) {
          baseClasses += ' -ml-[2px]';
        }
      } else {
        if (isLight) {
          baseClasses += ' bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600';
        } else {
          baseClasses += ' bg-white/10 text-white border-2 border-white/30 hover:bg-white/20';
        }
        if (!isFirst) {
          baseClasses += ' -ml-[2px]';
        }
      }
    } else {
      // Non-grouped border classes
      if (isSelected) {
        baseClasses += ' bg-primary-600 text-white border-2 border-primary-400';
      } else {
        if (isLight) {
          baseClasses += ' bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600';
        } else {
          baseClasses += ' bg-white/10 text-white border-2 border-white/30 hover:bg-white/20';
        }
      }
    }
    
    return baseClasses;
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
        value={validValue}
        onValueChange={onValueChange}
        className={getRootClassName()}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option, index) => (
          <RadioGroup.Item
            key={option}
            value={option}
            className={getChipClassName(option, index)}
          >
            <div className={isVertical ? 'flex items-center justify-between' : ''}>
              <span>{option}</span>
              {isVertical && validValue === option && validValue !== undefined && (
                <span className={mini ? 'text-sm' : 'text-xl'}>✓</span>
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
 * @param {string} props.layout - Layout type: 'grid', 'flex' (default), or 'grouped' for inline chips with shared borders
 * @param {string} props.variant - 'dark' (default) or 'light' for light backgrounds
 * @param {Object} props.optionData - Optional map of option values to objects with avatar, name, etc.
 * @param {Function} props.renderOption - Optional custom render function for options
 * @param {boolean} props.mini - If true, renders smaller chips with reduced padding and text size
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
  mini = false,
}) {
  const handleValueChange = (newValue) => {
    if (onValueChange) onValueChange(newValue);
  };

  const isGrouped = layout === 'grouped';
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
  
  // Mini variant sizing
  const chipPadding = mini
    ? (isLight ? 'px-2 py-0.5 text-xs rounded-full' : 'px-2 py-1 text-sm rounded-md')
    : (isLight ? 'px-3 py-0.5 text-sm rounded-full' : 'px-4 py-3 rounded-lg');
  const checkSize = mini ? 'text-xs' : (isLight ? 'text-sm' : 'text-xl');
  const gapClass = mini ? 'gap-1.5' : 'gap-2';
  
  const getChipClassName = (option, index) => {
    const isSelected = value?.includes(option);
    const isFirst = index === 0;
    const isLast = index === options.length - 1;
    
    // Base padding and text size
    let baseClasses = chipPadding;
    
    // Border radius for grouped layout
    if (isGrouped) {
      // Remove rounded classes and apply grouped-specific rounding
      baseClasses = baseClasses.replace(/rounded-\w+/g, '');
      if (isFirst && isLast) {
        baseClasses += mini ? ' rounded-md' : ' rounded-lg';
      } else if (isFirst) {
        baseClasses += mini ? ' rounded-l-md rounded-r-none' : ' rounded-l-lg rounded-r-none';
      } else if (isLast) {
        baseClasses += mini ? ' rounded-r-md rounded-l-none' : ' rounded-r-lg rounded-l-none';
      } else {
        baseClasses += ' rounded-none';
      }
    }
    
    // Border classes for grouped layout
    if (isGrouped) {
      if (isSelected) {
        baseClasses += ` ${selectedClass}`;
        if (!isFirst) {
          baseClasses += ' -ml-[2px]';
        }
      } else {
        baseClasses += ` ${unselectedClass}`;
        if (!isFirst) {
          baseClasses += ' -ml-[2px]';
        }
      }
    } else {
      // Non-grouped: use existing classes
      baseClasses += isSelected ? ` ${selectedClass}` : ` ${unselectedClass}`;
    }
    
    return `${baseClasses} font-medium text-left transition cursor-pointer flex items-center gap-2 focus:outline-none`;
  };

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
        className={
          layout === 'grid' 
            ? `grid grid-cols-1 md:grid-cols-2 ${gapClass}` 
            : isGrouped 
              ? 'inline-flex' 
              : `flex flex-wrap ${gapClass}`
        }
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option, index) => {
          const data = optionData[option] || {};
          const isSelected = value?.includes(option);
          
          return (
            <ToggleGroup.Item
              key={option}
              value={option}
              className={getChipClassName(option, index)}
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
