import { useRouter } from 'next/router';
import * as Slot from '@radix-ui/react-slot';

/**
 * Primary Button Component
 * Clean, modern button with amber/yellow gradient
 */
export default function PrimaryButton({ 
  children, 
  onClick, 
  href, 
  className = '', 
  disabled = false,
  type = 'button',
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

  const baseClasses = `
    inline-flex items-center justify-center
    px-4 py-2
    rounded-lg
    font-semibold text-sm
    text-purple-900
    bg-white
    hover:bg-white/90
    active:bg-white/80
    transition-all duration-200 ease-in-out
    shadow-md shadow-white/20
    hover:shadow-lg hover:shadow-white/30
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent
    ${className}
  `;

  if (asChild) {
    return (
      <Slot className={baseClasses} onClick={handleClick} disabled={disabled} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={baseClasses}
      {...props}
    >
      {children}
    </button>
  );
}
