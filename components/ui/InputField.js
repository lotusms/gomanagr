import * as Label from '@radix-ui/react-label';
import { forwardRef } from 'react';

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
}, ref) => {
  // Run validation if provided
  const validationError = validate ? validate(value) : null;
  const displayError = error || validationError;
  const hasError = !!displayError || hasErrorState;
  const isValid = !hasError && value && !checking;

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
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 border-2 rounded-lg
            focus:ring-2 focus:ring-primary-500 focus:border-transparent
            outline-none transition text-white placeholder-white/50 pr-12
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              hasError || hasErrorState
                ? 'border-red-500 bg-red-900/20'
                : checking
                ? 'border-yellow-500 bg-yellow-900/20'
                : 'border-white/30 bg-white/10'
            }
          `}
          aria-invalid={hasError || hasErrorState ? 'true' : 'false'}
          aria-describedby={displayError ? `${id}-error` : undefined}
          {...inputProps}
        />
        
        {/* Loading/Checking indicator */}
        {checking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
            {successIcon}
          </div>
        )}
        
        {/* Custom icon */}
        {!checking && !hasError && !isValid && icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {displayError && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-300" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
});

InputField.displayName = 'InputField';

export default InputField;
