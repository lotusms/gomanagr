import * as RadioGroup from '@radix-ui/react-radio-group';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Label from '@radix-ui/react-label';

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
 * @param {string} props.layout - Layout type: 'flex' (default) or 'vertical' for full-width stacked buttons
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
}) {
  const isVertical = layout === 'vertical';
  
  return (
    <div className={className}>
      <Label.Root
        htmlFor={id}
        className="block text-sm font-medium text-white mb-3"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label.Root>
      <RadioGroup.Root
        id={id}
        value={value || ''}
        onValueChange={onValueChange}
        className={isVertical ? 'space-y-3' : 'flex flex-wrap gap-3'}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option}
            value={option}
            className={`
              ${isVertical ? 'w-full px-6 py-4' : 'px-4 py-2'} rounded-lg font-medium transition cursor-pointer text-left
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-primary-900
              ${
                value === option
                  ? 'bg-primary-600 text-white border-2 border-primary-400'
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
        <p id={`${id}-error`} className="mt-2 text-sm text-red-300" role="alert">
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
}) {
  const handleValueChange = (newValue) => {
    // ToggleGroup returns a string array, we need to handle it properly
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <div className={className}>
      <Label.Root
        htmlFor={id}
        className="block text-sm font-medium text-white mb-3"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label.Root>
      <ToggleGroup.Root
        id={id}
        type="multiple"
        value={value || []}
        onValueChange={handleValueChange}
        className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'flex flex-wrap gap-3'}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => (
          <ToggleGroup.Item
            key={option}
            value={option}
            className={`
              px-4 py-3 rounded-lg font-medium text-left transition cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-primary-900
              ${
                value?.includes(option)
                  ? 'bg-primary-600 text-white border-2 border-primary-400'
                  : 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span>{option}</span>
              {value?.includes(option) && (
                <span className="ml-2 text-xl">✓</span>
              )}
            </div>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      {value && value.length > 0 && (
        <div className="mt-4 bg-primary-900/50 border border-primary-500/50 rounded-lg p-4">
          <p className="text-sm text-white">
            <span className="font-semibold">{value.length}</span> section{value.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
