import * as Select from '@radix-ui/react-select';
import { HiChevronDown, HiCheck } from 'react-icons/hi';
import {
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_BASE,
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_LIGHT_DEFAULT,
  FORM_CONTROL_LIGHT_LABEL,
} from './formControlStyles';

export default function Dropdown({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  label,
  required = false,
}) {
  const handleValueChange = (newValue) => {
    if (onChange) {
      // Create a synthetic event-like object for consistency with standard input onChange
      const syntheticEvent = {
        target: {
          name: name || id,
          value: newValue || undefined,
        },
        currentTarget: {
          name: name || id,
          value: newValue || undefined,
        },
      };
      onChange(syntheticEvent);
    }
  };

  // Radix Select treats undefined as uncontrolled, and any string (including empty) as controlled
  // To prevent controlled/uncontrolled switching, we need to ensure value is always the same type
  // If value is undefined or null, keep it undefined. If it's a string (even empty), keep it as a string
  // Empty strings are valid controlled values for Radix Select
  const selectValue = value === undefined || value === null ? undefined : value;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select.Root value={selectValue} onValueChange={handleValueChange} disabled={disabled}>
        <Select.Trigger
          id={id}
          name={name}
          className={`inline-flex items-center justify-between ${FORM_CONTROL_HEIGHT} ${FORM_CONTROL_BASE} ${FORM_CONTROL_FOCUS} ${FORM_CONTROL_LIGHT_DEFAULT} hover:bg-gray-50`}
          aria-label={label || placeholder}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon className="text-gray-500">
            <HiChevronDown className="w-4 h-4" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200 z-[110] min-w-[var(--radix-select-trigger-width)]">
            <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
              <HiChevronDown className="w-4 h-4 rotate-180" />
            </Select.ScrollUpButton>
            <Select.Viewport className="p-1">
              {options.map((option) => {
                const optionValue = typeof option === 'object' ? option.value : option;
                const optionLabel = typeof option === 'object' ? option.label : option;
                
                return (
                  <Select.Item
                    key={optionValue}
                    value={optionValue}
                    className="relative flex items-center justify-between px-3 py-2 text-sm leading-none text-gray-900 rounded-md select-none data-[highlighted]:bg-primary-50 data-[highlighted]:text-primary-700 data-[highlighted]:outline-none cursor-pointer"
                  >
                    <Select.ItemText>{optionLabel}</Select.ItemText>
                    <Select.ItemIndicator className="inline-flex items-center justify-center ml-2">
                      <HiCheck className="w-4 h-4 text-primary-600" />
                    </Select.ItemIndicator>
                  </Select.Item>
                );
              })}
            </Select.Viewport>
            <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
              <HiChevronDown className="w-4 h-4" />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
