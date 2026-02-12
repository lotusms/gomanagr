import { useState } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiEye, HiEyeOff } from 'react-icons/hi';

/**
 * Reusable Password Field Component using Radix UI
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the password field
 * @param {string} props.label - Label text for the password field
 * @param {string} props.value - Current password value
 * @param {Function} props.onChange - Callback when password changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.error - Error message to display
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the field is disabled
 * @param {Object} props.inputProps - Additional props to pass to the input element
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = 'Enter your password',
  required = false,
  error,
  className = '',
  disabled = false,
  inputProps = {},
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={className}>
      <Label.Root
        htmlFor={id}
        className="block text-sm font-medium text-white mb-2"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label.Root>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 border rounded-lg
            focus:ring-2 focus:ring-purple-500 focus:border-transparent
            outline-none transition text-white placeholder-white/50 pr-12
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? 'border-red-500 bg-red-900/20'
                : 'border-white/30 bg-white/10'
            }
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <HiEyeOff className="h-5 w-5" />
          ) : (
            <HiEye className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
