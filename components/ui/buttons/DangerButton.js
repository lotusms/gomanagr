import { useRouter } from 'next/router';
import { Slot } from '@radix-ui/react-slot';

/**
 * red Button Component
 * Solid red background with hover and focus states.
 */
export default function DangerButton({
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

  const buttonClasses = [
    'inline-flex items-center justify-center min-w-[7.5rem] px-6 py-2',
    'rounded-full font-semibold text-sm text-white',
    'bg-red-600 hover:bg-red-700 border-2 border-red-600 hover:border-red-700',
    'focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-colors cursor-pointer',
    className?.includes('w-full') && 'w-full',
    className,
  ].filter(Boolean).join(' ');

  if (asChild) {
    return (
      <Slot
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={buttonClasses}
      {...props}
    >
      {children}
    </button>
  );
}
