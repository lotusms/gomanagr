import { useState, useEffect } from 'react';
import * as Label from '@radix-ui/react-label';
import { getInputClasses, getLabelClasses } from './formControlStyles';
import { formatCurrency, unformatCurrency } from '@/utils/formatCurrency';

/**
 * Currency Input Component
 * Formats numeric input as currency based on the provided currency code.
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the input field
 * @param {string} props.label - Label text
 * @param {string} props.value - Current value (numeric string)
 * @param {Function} props.onChange - Callback with unformatted numeric value
 * @param {string} props.currency - Currency code (e.g., 'USD', 'EUR', 'GBP') - defaults to 'USD'
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.error - Error message
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {string} props.variant - 'dark' or 'light' variant
 * @param {Object} props.inputProps - Additional props for input element
 * @param {string} [props.sublabel] - Optional hint text below the label
 */
export default function CurrencyInput({
  id,
  label,
  sublabel,
  value,
  onChange,
  currency = 'USD',
  placeholder,
  required = false,
  error,
  className = '',
  disabled = false,
  variant = 'dark',
  inputProps = {},
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const getCurrencySymbol = (code) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
    };
    return symbols[code] || code;
  };

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (!isFocused) {
      if (value && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(numValue);
          setDisplayValue(formatted);
        } else {
          setDisplayValue('');
        }
      } else {
        setDisplayValue('');
      }
    }
  }, [value, currency, isFocused]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    const unformatted = unformatCurrency(inputValue);
    
    setDisplayValue(unformatted);
    
    if (onChange) {
      onChange({ ...e, target: { ...e.target, value: unformatted } });
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    setDisplayValue(value || '');
    if (inputProps.onFocus) {
      inputProps.onFocus(e);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (value && value !== '') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numValue);
        setDisplayValue(formatted);
      }
    }
    if (inputProps.onBlur) {
      inputProps.onBlur(e);
    }
  };

  const isLight = variant === 'light';
  const labelClass = getLabelClasses(variant);
  const hasError = !!error;
  const inputClass = getInputClasses(variant, hasError);
  const errorTextClass = isLight ? 'mt-1 text-sm text-red-600' : 'mt-1 text-sm text-red-300';

  return (
    <div className={className}>
      {label != null && label !== '' && (
        <Label.Root htmlFor={id} className={labelClass}>
          {label}
          {required && <span className={isLight ? 'text-red-500 ml-1' : 'text-red-400 ml-1'}>*</span>}
        </Label.Root>
      )}
      <div className="relative">
        {/* Currency symbol prefix */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
          {currencySymbol}
        </span>
        <input
          id={id}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder || `0.00`}
          className={`${inputClass} pl-8`}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          inputMode="decimal"
          {...inputProps}
        />
      </div>
      {sublabel != null && sublabel !== '' && (!value || String(value).trim() === '') && (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
          {sublabel}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={errorTextClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
