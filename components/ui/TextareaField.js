import * as Label from '@radix-ui/react-label';
import { FORM_CONTROL_BASE, FORM_CONTROL_FOCUS, FORM_CONTROL_LIGHT_DEFAULT, FORM_CONTROL_LIGHT_LABEL } from './formControlStyles';

/**
 * Textarea with Radix Label and shared form styles (light variant).
 * @param {string} [sublabel] - Optional hint text below the label
 */
export default function TextareaField({
  id,
  label,
  sublabel,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  disabled = false,
  className = '',
  rows = 4,
}) {
  const hasError = !!error;
  const inputClass = `${FORM_CONTROL_BASE} ${FORM_CONTROL_FOCUS} ${hasError ? 'border-red-500 bg-red-50' : FORM_CONTROL_LIGHT_DEFAULT} py-2`;

  return (
    <div className={className}>
      {label && (
        <Label.Root htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
          {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
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
        className={`w-full resize-y min-h-[80px] ${inputClass}`}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {sublabel != null && sublabel !== '' && (!value || String(value).trim() === '') && (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{sublabel}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
