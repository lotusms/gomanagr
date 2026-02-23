import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

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
          flex h-5 w-5 shrink-0 items-center justify-center rounded border-2
          bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          disabled:cursor-not-allowed disabled:opacity-50
          data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600
          dark:data-[state=checked]:bg-primary-500 dark:data-[state=checked]:border-primary-500
          hover:border-gray-400 dark:hover:border-gray-500
          data-[state=checked]:hover:border-primary-600 dark:data-[state=checked]:hover:border-primary-500
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
          className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
}
