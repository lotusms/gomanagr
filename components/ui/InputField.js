import * as Label from '@radix-ui/react-label';
import { forwardRef } from 'react';
import { getInputClasses, getLabelClasses } from './formControlStyles';

/**
 * Reusable Input Field Component using Radix UI
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the input field
 * @param {string} props.label - Label text for the input field
 * @param {string} props.type - Input type (text, email, tel, number, etc.)
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Callback when input changes
 * @param {Function} props.onBlur - Callback when input loses focus
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.error - Error message to display
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the field is disabled
 * @param {boolean} props.checking - Whether the field is in a checking/loading state
 * @param {React.ReactNode} props.icon - Icon to display on the right side
 * @param {React.ReactNode} props.successIcon - Success icon to display when valid
 * @param {React.ReactNode} props.errorIcon - Error icon to display when invalid
 * @param {boolean} props.hasErrorState - Force error state styling (for cases like email exists)
 * @param {Object} props.inputProps - Additional props to pass to the input element
 * @param {Function} props.validate - Validation function that returns error message or null
 * @param {string} props.variant - 'dark' (default) for dark backgrounds, 'light' for light backgrounds
 */
const InputField = forwardRef(({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  className = '',
  disabled = false,
  checking = false,
  icon,
  successIcon,
  errorIcon,
  hasErrorState = false,
  inputProps = {},
  validate,
  variant = 'dark',
}, ref) => {
  const handleChange = (e) => {
    if (!onChange) return;
    onChange(e);
  };

  const validationError = validate ? validate(value) : null;
  const displayError = error || validationError;
  const hasError = !!displayError || hasErrorState;
  const isValid = !hasError && value && !checking;

  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const hasErrorState_ = hasError || hasErrorState;
  const inputClass = getInputClasses(variant, hasErrorState_ && !checking);
  const checkingClass = checking
    ? (isLight
        ? 'border-amber-400 bg-amber-50 text-gray-900 placeholder-gray-400'
        : 'border-yellow-500 bg-yellow-900/20 text-white placeholder-white/50')
    : '';
  const iconPadding = type === 'number' ? 'pr-3' : type === 'date' ? 'pr-3' : 'pr-10';

  const errorTextClass = isLight ? 'mt-1 text-sm text-red-600' : 'mt-1 text-sm text-red-300';

  return (
    <div className={className}>
      <Label.Root
        htmlFor={id}
        className={labelClass}
      >
        {label}
        {required && <span className={isLight ? 'text-red-500 ml-1' : 'text-red-400 ml-1'}>*</span>}
      </Label.Root>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`${inputClass} ${checkingClass} ${iconPadding}`}
          style={
            variant === 'dark' && !checking && !hasErrorState_
              ? { color: 'white', WebkitTextFillColor: 'white' } // Force white text immediately for dark variant
              : undefined
          }
          aria-invalid={hasError || hasErrorState ? 'true' : 'false'}
          aria-describedby={displayError ? `${id}-error` : undefined}
          {...inputProps}
        />
        
        {/* Loading/Checking indicator - use theme CSS variable so palette (e.g. Rose ternary) applies */}
        {checking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ternary-500)' }}>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
          </div>
        )}
        
        {/* Error icon */}
        {!checking && (hasError || hasErrorState) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-xl">
            {errorIcon || '⚠️'}
          </div>
        )}
        
        {/* Success icon */}
        {!checking && !hasError && isValid && successIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ternary-500)' }}>
            {successIcon}
          </div>
        )}
        
        {/* Custom icon */}
        {!checking && !hasError && !isValid && icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ternary-500)' }}>
            {icon}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {displayError && (
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
});

InputField.displayName = 'InputField';

export default InputField;
