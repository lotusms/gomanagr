/**
 * Reusable icon-only button with variant styling.
 * @param {'primary' | 'secondary' | 'danger' | 'light'} variant - Color variant
 * @param {boolean} [white] - When variant is 'light', force white icon/background (e.g. on dark cards)
 * @param {string} [className] - Additional classes (e.g. position, group-hover)
 */
export default function IconButton({
  variant = 'primary',
  white = false,
  className = '',
  children,
  ...props
}) {
  const base =
    'p-2 rounded-full overflow-hidden transition-all border border-white/30 dark:border-gray-700/30 duration-200 inline-flex items-center justify-center';

  const variants = {
    primary:
      'bg-primary-600 hover:bg-primary-700 border-2 border-primary-600 hover:border-primary-700 text-white',
    secondary:
      'text-amber-500 hover:text-amber-700 hover:bg-white/20 dark:hover:bg-gray-700/20',
    danger:
      'text-red-500 hover:text-red-600 hover:bg-white/20 dark:hover:bg-gray-700/20',
    light: white
      ? 'text-white hover:text-white/90 hover:bg-white/20 dark:hover:bg-gray-700/20'
      : 'text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/20',
  };

  const variantClass = variants[variant] ?? variants.primary;
  const combined = [base, variantClass, className].filter(Boolean).join(' ');

  return (
    <button type="button" className={combined} {...props}>
      {children}
    </button>
  );
}
