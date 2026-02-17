/**
 * Shared form control design tokens.
 * Use these in InputField, PasswordField, Dropdown, etc. for a consistent look.
 */

// Height: all controls use the same height (40px)
export const FORM_CONTROL_HEIGHT = 'h-9';

// Base classes for all text-like controls (input, trigger)
export const FORM_CONTROL_BASE =
  'w-full px-3 text-sm rounded-md border outline-none transition disabled:opacity-50 disabled:cursor-not-allowed';

// Focus state (same for all)
export const FORM_CONTROL_FOCUS =
  'focus:outline-none focus:ring-1 focus:ring-ternary-500 focus:ring-offset-0 focus:border-ternary-500';

// Light variant (e.g. settings, white cards)
export const FORM_CONTROL_LIGHT_DEFAULT =
  'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400';
export const FORM_CONTROL_LIGHT_ERROR = 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20';
export const FORM_CONTROL_LIGHT_LABEL = 'block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2';

// Dark variant (e.g. login, dark backgrounds)
export const FORM_CONTROL_DARK_DEFAULT =
  'border-white/30 bg-white/10 text-white placeholder-white/50';
export const FORM_CONTROL_DARK_ERROR = 'border-red-500 bg-red-900/20';
export const FORM_CONTROL_DARK_LABEL = 'block text-sm font-medium text-white mb-2';

// Combined: use for input/trigger element
export const getInputClasses = (variant, hasError) => {
  const base = `${FORM_CONTROL_HEIGHT} ${FORM_CONTROL_BASE} ${FORM_CONTROL_FOCUS}`;
  const state = variant === 'light'
    ? (hasError ? FORM_CONTROL_LIGHT_ERROR : FORM_CONTROL_LIGHT_DEFAULT)
    : (hasError ? FORM_CONTROL_DARK_ERROR : FORM_CONTROL_DARK_DEFAULT);
  return `${base} ${state}`;
};

export const getLabelClasses = (variant) =>
  variant === 'light' ? FORM_CONTROL_LIGHT_LABEL : FORM_CONTROL_DARK_LABEL;
