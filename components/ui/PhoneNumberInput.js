import { forwardRef } from 'react';
import InputField from '@/components/ui/InputField';
import { formatPhone } from '@/utils/formatPhone';

/**
 * Phone number input that formats as (xxx) xxx-xxxx as the user types.
 * Value and onChange use the formatted string; use unformatPhone(value) when saving.
 *
 * @param {Object} props - Same as InputField (id, label, value, onChange, placeholder, etc.)
 * @param {string} props.value - Formatted phone string, e.g. '(717) 123-4567'
 * @param {Function} props.onChange - Called with formatted value: (formattedValue) => void
 */
const PhoneNumberInput = forwardRef(({ value, onChange, placeholder = '(717) 123-4567', ...rest }, ref) => {
  const handleChange = (e) => {
    const formatted = formatPhone(e.target.value);
    onChange?.(formatted);
  };

  return (
    <InputField
      ref={ref}
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      {...rest}
    />
  );
});

PhoneNumberInput.displayName = 'PhoneNumberInput';

export default PhoneNumberInput;
