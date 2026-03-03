import * as Label from '@radix-ui/react-label';
import { forwardRef } from 'react';
import { getInputClasses, getLabelClasses } from './formControlStyles';

/**
 * Reusable number input aligned with InputField: same height, borders, focus ring, and variants.
 * Use for quantity, count, or any numeric field where spinners are appropriate.
 *
 * @param {Object} props
 * @param {string} props.id - Unique ID for the input
 * @param {string} [props.label] - Optional label text
 * @param {number|string} props.value - Current value (number or '' for empty)
 * @param {Function} props.onChange - (e) => void; e.target.value is string (or '')
 * @param {number} [props.min] - min attribute
 * @param {number} [props.max] - max attribute
 * @param {number|string} [props.step] - step attribute (default 1)
 * @param {string} [props.placeholder]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {string} [props.error] - Error message (same styling as InputField)
 * @param {string} [props.className]
 * @param {string} [props.variant] - 'dark' | 'light' (default 'dark')
 * @param {string} [props.inputClassName] - Extra classes for the input (e.g. 'text-right')
 * @param {Object} [props.inputProps] - Extra props for the input element
 */
const NumberField = forwardRef(({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  variant = 'dark',
  inputClassName = '',
  inputProps = {},
}, ref) => {
  const hasError = !!error;
  const labelClass = getLabelClasses(variant);
  const inputClass = getInputClasses(variant, hasError);
  const errorTextClass = variant === 'light' ? 'mt-1 text-sm text-red-600' : 'mt-1 text-sm text-red-300';

  const numValue = value === '' || value == null ? '' : Number(value);

  return (
    <div className={className}>
      {label != null && label !== '' && (
        <Label.Root htmlFor={id} className={labelClass}>
          {label}
          {required && (
            <span className={variant === 'light' ? 'text-red-500 ml-1' : 'text-red-400 ml-1'}>*</span>
          )}
        </Label.Root>
      )}
      <input
        ref={ref}
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={numValue}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`${inputClass} pr-3 ${inputClassName}`.trim()}
        style={
          variant === 'dark' && !hasError
            ? { color: 'white', WebkitTextFillColor: 'white' }
            : undefined
        }
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

NumberField.displayName = 'NumberField';

export default NumberField;
