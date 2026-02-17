import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

/**
 * Reusable Checkbox Component using Radix UI
 * 
 * @param {Object} props
 * @param {boolean} props.checked - Whether the checkbox is checked
 * @param {Function} props.onCheckedChange - Callback when checked state changes (receives boolean)
 * @param {string} props.id - Unique ID for the checkbox
 * @param {string} props.label - Label text for the checkbox
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the checkbox is disabled
 * @param {React.ReactNode} props.children - Custom label content (overrides label prop)
 */
export default function Checkbox({
  checked,
  onCheckedChange,
  id,
  label,
  className = '',
  disabled = false,
  children,
  ...props
}) {
  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <CheckboxPrimitive.Root
        className={`
          flex h-5 w-5 items-center justify-center rounded border-2
          bg-white/10 border-white/30
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent
          disabled:cursor-not-allowed disabled:opacity-50
          data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600
          hover:border-primary-400
        `}
        checked={checked}
        onCheckedChange={onCheckedChange}
        id={id}
        disabled={disabled}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.6666 3.5L5.24998 9.91667L2.33331 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {children || (
        <label
          htmlFor={id}
          className="text-sm text-white dark:text-gray-200 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
}
