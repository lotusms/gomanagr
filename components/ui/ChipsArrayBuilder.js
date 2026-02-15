import { useState, useRef } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiPlus, HiX } from 'react-icons/hi';
import { PrimaryButton } from '@/components/ui/buttons';
import { FORM_CONTROL_LIGHT_LABEL } from './formControlStyles';
import {
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_BASE,
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_LIGHT_DEFAULT,
} from './formControlStyles';

/**
 * Build an array of strings: input + add button, chips below with remove.
 * @param {string} id
 * @param {string} [label]
 * @param {string[]} value - Current array of items
 * @param {(items: string[]) => void} onChange
 * @param {string} [placeholder] - Placeholder for the input
 * @param {boolean} [disabled]
 * @param {string} [className]
 * @param {string} [addButtonLabel] - e.g. "Add"
 */
export default function ChipsArrayBuilder({
  id,
  label,
  value = [],
  onChange,
  placeholder = 'Type and add...',
  disabled = false,
  className = '',
  addButtonLabel = 'Add',
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || disabled) return;
    if (value.includes(trimmed)) {
      setInputValue('');
      return;
    }
    onChange([...value, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (item) => {
    onChange(value.filter((x) => x !== item));
  };

  return (
    <div className={className}>
      {label && (
        <Label.Root htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
        </Label.Root>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 min-w-0 ${FORM_CONTROL_HEIGHT} ${FORM_CONTROL_BASE} ${FORM_CONTROL_FOCUS} ${FORM_CONTROL_LIGHT_DEFAULT}`}
        />
        <PrimaryButton
          type="button"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim()}
          className="flex-shrink-0 gap-1.5 h-9 min-w-0 px-4"
        >
          <HiPlus className="w-4 h-4" />
          {addButtonLabel}
        </PrimaryButton>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200 text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                disabled={disabled}
                className="p-0.5 rounded-full hover:bg-primary-200 text-primary-700"
                aria-label={`Remove ${item}`}
              >
                <HiX className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
