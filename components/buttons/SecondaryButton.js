import { useRouter } from 'next/router';
import * as Slot from '@radix-ui/react-slot';

/**
 * Secondary Button Component
 * Two stacked pills: gradient pill behind, solid purple pill on top (2px inset = gradient shows as border)
 */
export default function SecondaryButton({ 
  children, 
  onClick, 
  href, 
  className = '', 
  disabled = false,
  type = 'button',
  variant = 'white', // 'white' or 'purple'
  asChild = false,
  ...props 
}) {
  const router = useRouter();

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (href) {
      e.preventDefault();
      router.push(href);
    } else if (onClick) {
      onClick(e);
    }
  };

  const variantTextClasses = {
    white: 'text-white',
    purple: 'text-purple-100 hover:text-purple-50',
  };

  // Back pill: two gradient layers, crossfade opacity for smooth reverse
  const backPillBase = 'absolute inset-0 rounded-full transition-opacity duration-700 ease-in-out';
  const backPillA = `${backPillBase} bg-gradient-to-r from-purple-500 to-pink-500 opacity-100 group-hover:opacity-0`;
  const backPillB = `${backPillBase} bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100`;

  // Front pill: solid purple, 2px smaller; bg stays the same on hover (only gradient border reverses)
  const frontPillClasses = `
    relative
    inline-flex items-center justify-center
    min-w-[7.5rem]
    px-6 py-3
    rounded-full
    font-semibold text-sm
    bg-purple-900
    transition-all duration-500 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent
    ${variantTextClasses[variant] || variantTextClasses.white}
    ${className}
  `;

  // Wrapper: holds both pills, padding creates the 2px gap
  const wrapperClasses = `
    relative
    inline-block
    rounded-full
    p-[2px]
    transition-all duration-500 ease-in-out
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}
  `;

  if (asChild) {
    return (
      <span className={wrapperClasses}>
        <span className="absolute inset-0 rounded-full" aria-hidden>
          <span className={backPillA} />
          <span className={backPillB} />
        </span>
        <Slot className={frontPillClasses} onClick={handleClick} disabled={disabled} {...props}>
          {children}
        </Slot>
      </span>
    );
  }

  return (
    <span className={wrapperClasses}>
      <span className="absolute inset-0 rounded-full" aria-hidden>
        <span className={backPillA} />
        <span className={backPillB} />
      </span>
      <button
        type={type}
        onClick={handleClick}
        disabled={disabled}
        className={frontPillClasses}
        {...props}
      >
        {children}
      </button>
    </span>
  );
}
