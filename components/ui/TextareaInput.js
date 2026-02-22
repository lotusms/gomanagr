import * as Label from '@radix-ui/react-label';
import { getTextareaClasses, getLabelClasses } from './formControlStyles';

/**
 * Reusable Textarea component with label, error state, and light/dark variant.
 * Matches InputField API for consistent forms (e.g. in dialogs and settings).
 *
 * @param {Object} props
 * @param {string} props.id - Unique ID for the textarea
 * @param {string} props.label - Label text
 * @param {string} props.value - Current value
 * @param {Function} props.onChange - Callback when value changes
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.required] - Show required asterisk
 * @param {string} [props.error] - Error message below field
 * @param {string} [props.className] - Wrapper div class
 * @param {boolean} [props.disabled] - Disabled state
 * @param {number} [props.rows] - Row count (default 3)
 * @param {string} [props.variant] - 'light' | 'dark' (default 'light' for dialogs/cards)
 */
export default function TextareaInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  className = '',
  disabled = false,
  rows = 3,
  variant = 'light',
}) {
  const hasError = !!error;
  const labelClass = getLabelClasses(variant);
  const textareaClass = getTextareaClasses(variant, hasError);
  const errorTextClass = variant === 'light' ? 'mt-1 text-sm text-red-600 dark:text-red-400' : 'mt-1 text-sm text-red-300';

  return (
    <div className={className}>
      {label != null && label !== '' && (
        <Label.Root htmlFor={id} className={labelClass}>
          {label}
          {required && <span className={variant === 'light' ? 'text-red-500 ml-1' : 'text-red-400 ml-1'}>*</span>}
        </Label.Root>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={textareaClass}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
