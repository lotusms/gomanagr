import { useRouter } from 'next/router';
import * as Slot from '@radix-ui/react-slot';

/**
 * Primary Button Component
 * Solid primary background with hover and focus states.
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

  const buttonClasses = [
    'inline-flex items-center justify-center min-w-[7.5rem] px-6 py-2',
    'rounded-full font-semibold text-sm text-white',
    'bg-primary-600 hover:bg-primary-700 border-2 border-primary-600 hover:border-primary-700',
    'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-transparent',
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
