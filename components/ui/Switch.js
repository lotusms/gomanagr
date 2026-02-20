import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as Label from '@radix-ui/react-label';

/**
 * Switch Component - Toggle switch using Radix UI Switch
 * Perfect for on/off toggles
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the switch
 * @param {string} props.label - Optional label text for the switch
 * @param {boolean} props.checked - Whether the switch is checked
 * @param {Function} props.onCheckedChange - Callback when checked state changes (receives boolean)
 * @param {boolean} props.disabled - Whether the switch is disabled
 * @param {string} props.className - Additional CSS classes
 */
export default function Switch({
  id,
  label,
  checked,
  onCheckedChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={`
          w-11 h-6 rounded-full relative
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            checked
              ? 'bg-primary-600 dark:bg-primary-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }
        `}
      >
        <SwitchPrimitive.Thumb
          className={`
            block w-5 h-5 bg-white rounded-full shadow-sm
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </SwitchPrimitive.Root>
      {label && (
        <Label.Root
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          {label}
        </Label.Root>
      )}
    </div>
  );
}
