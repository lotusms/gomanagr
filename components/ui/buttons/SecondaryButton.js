import { useRouter } from 'next/router';
import * as Slot from '@radix-ui/react-slot';

/**
 * Secondary Button Component
 * Same shape as PrimaryButton with secondary-colored border (outline style).
 * Use variant="light" on dark backgrounds for light border/text.
 */
export default function SecondaryButton({
  children,
  onClick,
  href,
  className = '',
  disabled = false,
  type = 'button',
  asChild = false,
  variant = 'default',
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

  const variantClasses =
    variant === 'light'
      ? 'border-2 border-white text-white hover:bg-white/10 hover:border-primary-200'
      : 'border-2 border-secondary-500 text-secondary-500 hover:text-secondary-500/80 hover:border-secondary-500/80';

  const buttonClasses = [
    'inline-flex items-center justify-center min-w-[7.5rem] px-6 py-2',
    'rounded-full font-semibold text-sm',
    'bg-transparent',
    variantClasses,
    'focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2 focus:ring-offset-transparent',
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
