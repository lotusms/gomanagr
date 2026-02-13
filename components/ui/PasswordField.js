import { useState } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { getInputClasses, getLabelClasses } from './formControlStyles';

/**
 * Reusable Password Field Component using Radix UI
 * Matches InputField and Dropdown height, borders, and focus states.
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
 * @param {string} props.variant - 'dark' (default) or 'light'
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
  variant = 'dark',
}) {
  const [showPassword, setShowPassword] = useState(false);
  const labelClass = getLabelClasses(variant);
  const inputClass = getInputClasses(variant, !!error);
  const errorTextClass = variant === 'light' ? 'mt-1 text-sm text-red-600' : 'mt-1 text-sm text-red-300';

  return (
    <div className={className}>
      <Label.Root htmlFor={id} className={labelClass}>
        {label}
        {required && <span className={variant === 'light' ? 'text-red-500 ml-1' : 'text-red-400 ml-1'}>*</span>}
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
          className={`${inputClass} pr-10`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed [color:var(--color-ternary-500)] hover:[color:var(--color-ternary-600)]"
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
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
