import { useRouter } from 'next/router';
import * as Slot from '@radix-ui/react-slot';

/**
 * Secondary Button Component
 * Clean, modern outlined button
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

  const variantClasses = {
    white: `
      border border-white/50
      text-white
      bg-white/5 backdrop-blur-sm
      hover:bg-white/10 hover:border-white/70
      active:bg-white/15
      shadow-sm shadow-white/5
      hover:shadow-md hover:shadow-white/10
    `,
    purple: `
      border border-purple-400/50
      text-purple-200
      bg-purple-900/10 backdrop-blur-sm
      hover:bg-purple-900/20 hover:border-purple-400/70
      hover:text-purple-100
      active:bg-purple-900/30
      shadow-sm shadow-purple-500/5
      hover:shadow-md hover:shadow-purple-500/10
    `,
  };

  const baseClasses = `
    inline-flex items-center justify-center
    px-4 py-2
    rounded-lg
    font-semibold text-sm
    transition-all duration-200 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
    ${variant === 'white' 
      ? 'focus:ring-white/50' 
      : 'focus:ring-purple-400/50'
    }
    ${variantClasses[variant] || variantClasses.white}
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
