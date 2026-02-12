import { useRouter } from 'next/router';
import * as Slot from '@radix-ui/react-slot';

/**
 * Primary Button Component
 * Two stacked pills: gradient behind, gradient on top (2px inset = gradient shows as border)
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

  // Back pill: two gradient layers, crossfade opacity for smooth reverse
  const backPillBase = 'absolute inset-0 rounded-full transition-opacity duration-700 ease-in-out';
  const backPillA = `${backPillBase} bg-gradient-to-r from-purple-500 to-pink-500 opacity-100 group-hover:opacity-0`;
  const backPillB = `${backPillBase} bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100`;

  // Front pill: two gradient layers + content, crossfade for smooth reverse
  const frontPillBase = 'relative inline-flex items-center justify-center min-w-[7.5rem] px-6 py-3 rounded-full font-semibold text-sm text-white overflow-hidden';
  const frontPillLayerBase = 'absolute inset-0 rounded-full transition-opacity duration-700 ease-in-out';
  const frontPillLayerA = `${frontPillLayerBase} bg-gradient-to-r from-purple-500 to-pink-500 opacity-100 hover:opacity-0`;
  const frontPillLayerB = `${frontPillLayerBase} bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 hover:opacity-100`;
  const frontPillClasses = `
    ${frontPillBase}
    shadow-md shadow-purple-500/10 hover:shadow-lg hover:shadow-purple-500/15
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent
    ${className}
  `;

  // Wrapper: holds both pills, padding creates the 2px gap; full width when button has w-full
  const wrapperClasses = `
    relative
    inline-block
    rounded-full
    p-[2px]
    transition-all duration-500 ease-in-out
    ${className && className.includes('w-full') ? 'block w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}
  `;

  const frontPillContent = (
    <>
      <span className={frontPillLayerA} aria-hidden />
      <span className={frontPillLayerB} aria-hidden />
      <span className="relative z-10">{children}</span>
    </>
  );

  if (asChild) {
    return (
      <span className={wrapperClasses}>
        <span className="absolute inset-0 rounded-full" aria-hidden>
          <span className={backPillA} />
          <span className={backPillB} />
        </span>
        <Slot className={frontPillClasses} onClick={handleClick} disabled={disabled} {...props}>
          <span>
            {frontPillContent}
          </span>
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
        {frontPillContent}
      </button>
    </span>
  );
}
