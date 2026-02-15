import { HiUser } from 'react-icons/hi';

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
};

/**
 * Avatar: photo when src is provided, otherwise initials from name, or fallback icon.
 * Same pattern as header user menu (logo/initials).
 * @param {string} [src] - Image URL (e.g. team member photo, company logo)
 * @param {string} [name] - Used for initials when src is missing (e.g. "Jane Doe" → "JD")
 * @param {'sm'|'md'|'lg'} [size] - Size variant (default: md)
 * @param {string} [className] - Extra classes for the root element
 */
export default function Avatar({ src, name, size = 'md', className = '' }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-200 text-gray-500 font-medium ${sizeClass} ${className}`.trim()}
      role="img"
      aria-label={name ? `Avatar for ${name}` : 'Avatar'}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <HiUser className="w-1/2 h-1/2" />
      )}
    </div>
  );
}
