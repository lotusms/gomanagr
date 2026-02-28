import * as Label from '@radix-ui/react-label';
import { getInputClasses, getLabelClasses } from './formControlStyles';

/**
 * Reusable datetime-local input. Matches InputField height, focus, and hover styles
 * for alignment when used in a grid with InputField.
 *
 * @param {string} id - Unique ID for the input
 * @param {string} label - Label text
 * @param {string} value - Value in datetime-local format (YYYY-MM-DDTHH:mm)
 * @param {function} onChange - Called with (e) when value changes
 * @param {string} [variant='light'] - 'light' or 'dark'
 * @param {string} [error] - Error message (applies error styling)
 * @param {boolean} [required=false]
 * @param {boolean} [disabled=false]
 * @param {string} [className='']
 * @param {function} [onBlur]
 */
export default function DateTimeField({
  id,
  label,
  value,
  onChange,
  onBlur,
  variant = 'light',
  error,
  required = false,
  disabled = false,
  className = '',
}) {
  const hasError = !!error;
  const labelClass = getLabelClasses(variant);
  const inputClass = getInputClasses(variant, hasError);
  const errorTextClass = variant === 'light' ? 'mt-1 text-sm text-red-600' : 'mt-1 text-sm text-red-300';

  return (
    <div className={className}>
      {label && (
        <Label.Root htmlFor={id} className={labelClass}>
          {label}
          {required && <span className={variant === 'light' ? 'text-red-500 ml-1' : 'text-red-400 ml-1'}>*</span>}
        </Label.Root>
      )}
      <input
        id={id}
        type="datetime-local"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
      />
      {error && (
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
