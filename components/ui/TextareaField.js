import * as Label from '@radix-ui/react-label';
import { FORM_CONTROL_BASE, FORM_CONTROL_FOCUS, FORM_CONTROL_LIGHT_DEFAULT, FORM_CONTROL_LIGHT_LABEL } from './formControlStyles';

/**
 * Textarea with Radix Label and shared form styles (light variant).
 */
export default function TextareaField({
  id,
  label,
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
          {required && <span className="text-red-500 ml-1">*</span>}
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
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
