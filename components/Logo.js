import Link from 'next/link';
import { useState, useEffect } from 'react';

/**
 * Logo component using SVG assets with theme colors.
 * G = primary, O = secondary, "Manager" wordmark = dark (or light when wordmarkLight).
 * @param {Object} props
 * @param {'inline'|'stacked'|'responsive'} props.variant - 'inline' | 'stacked' | 'responsive' (stacked ≤md, inline lg+)
 * @param {string} [props.href] - When provided, wraps in Link (e.g. href="/" for nav/footer)
 * @param {string} [props.className] - Optional class for the root wrapper
 * @param {string} [props.tagline] - Optional tagline below the wordmark (stacked variant only)
 * @param {boolean} [props.wordmarkLight] - Use light color for "Manager" wordmark (e.g. on dark backgrounds)
 * @param {string} [props.inlineClassName] - Extra classes for inline SVG (e.g. "h-16" for larger)
 */
const MANAGER_DARK = '#231f20';
const MANAGER_LIGHT = '#ffffff';

const inlinePathManager =
  'M1000.42,218.64v19.5c-1.76-.14-3.11-.27-4.74-.27-11.64,0-19.36,6.36-19.36,20.31v36.51h-21.12v-74.97h20.18v9.61c5.15-7.04,13.81-10.7,25.05-10.7ZM947.48,220.77v60.66c0,27.08-14.62,39.54-40.89,39.54-13.81,0-27.22-3.38-35.75-10.02l8.4-15.16c6.23,5.01,16.38,8.26,25.73,8.26,14.89,0,21.39-6.77,21.39-19.9v-3.11c-5.55,6.09-13.54,9.07-23.02,9.07-20.18,0-36.42-13.95-36.42-35.2s16.25-35.2,36.42-35.2c10.16,0,18.55,3.39,24.1,10.43v-9.34h20.04ZM926.62,254.89c0-10.7-7.99-17.87-19.09-17.87s-19.23,7.18-19.23,17.87,8.12,17.87,19.23,17.87,19.09-7.18,19.09-17.87ZM858.47,252.04v42.65h-19.77v-10.16c-3.93,6.63-11.51,10.16-22.2,10.16-17.06,0-27.22-9.48-27.22-22.07s9.07-21.8,31.28-21.8h16.79c0-9.07-5.42-14.35-16.79-14.35-7.72,0-15.71,2.57-20.99,6.77l-7.58-14.76c7.99-5.69,19.77-8.8,31.41-8.8,22.21,0,35.07,10.29,35.07,32.36ZM837.35,270.59v-7.45h-14.49c-9.88,0-13,3.66-13,8.53,0,5.28,4.47,8.8,11.92,8.8,7.04,0,13.13-3.25,15.57-9.88ZM782.39,251.91v42.79h-21.12v-39.54c0-11.78-5.42-17.2-14.76-17.2-10.16,0-17.47,6.23-17.47,19.63v37.1h-21.12v-75.01s20.18,0,20.18,0v9.61c5.69-6.23,14.22-9.61,24.1-9.61,17.2,0,30.19,10.02,30.19,32.23ZM700.78,252.04v42.65h-19.77v-10.16c-3.93,6.63-11.51,10.16-22.2,10.16-17.06,0-27.22-9.48-27.22-22.07s9.07-21.8,31.28-21.8h16.79c0-9.07-5.42-14.35-16.79-14.35-7.72,0-15.71,2.57-20.99,6.77l-7.58-14.76c7.99-5.69,19.77-8.8,31.41-8.8,22.21,0,35.07,10.29,35.07,32.36ZM679.66,270.59v-7.45h-14.49c-9.88,0-13,3.66-13,8.53,0,5.28,4.47,8.8,11.92,8.8,7.04,0,13.13-3.25,15.57-9.88ZM603.25,294.7l-.14-56.87-27.89,46.85h-9.88l-27.76-45.63v55.65h-20.58v-94.78h18.14l35.47,58.9,34.93-58.9h18.01l.27,94.78h-20.58ZM429.8,257.12c0-21.94,16.93-37.51,40.08-37.51s39.94,15.57,39.94,37.51-16.79,37.51-39.94,37.51-40.08-15.57-40.08-37.51ZM488.43,257.12c0-12.59-7.99-20.18-18.55-20.18s-18.69,7.58-18.69,20.18,8.12,20.18,18.69,20.18,18.55-7.58,18.55-20.18ZM402.4,244.12h20.04v38.45c-10.43,7.85-24.78,12.05-38.32,12.05-29.79,0-51.72-20.45-51.72-49.01s21.94-49.01,52.13-49.01c16.65,0,30.46,5.69,39.67,16.38l-14.08,13c-6.91-7.31-14.89-10.7-24.51-10.7-18.41,0-31.01,12.32-31.01,30.33s12.59,30.33,30.74,30.33c5.96,0,11.51-1.08,17.06-4.06v-27.76Z';
const inlinePathG =
  'M316.21,245.52c0,52.2-36.69,88.89-88.9,88.89-9.69,0-18.82-1.25-27.27-3.63v-54.77c6.14,9.72,15.63,15.24,27.54,15.24,21.19,0,35.14-18.35,35.14-46.51s-13.69-47.3-35.4-47.3c-12.78,0-22.81,6.51-28.81,17.8-3.61-17.41-12.25-32.99-24.34-45.14,14.38-10.13,32.5-15.82,53.14-15.82,53.5,0,88.9,36.44,88.9,91.23Z';
const inlinePathO =
  'M193.63,241.09v93.32s-40.06,0-40.06,0v-14.59c-13.52,9.81-30.55,14.59-48.32,14.59-47.3,0-81.67-37.98-81.67-89.93s35.14-90.18,86.58-90.18c42.38,0,73.39,24.81,80.11,63.57l-51.17,1.03c-3.62-13.69-13.95-21.44-28.43-21.44-21.45,0-33.59,16.53-33.59,45.74,0,32.3,13.18,49.88,37.21,49.88,14.48,0,25.32-6.98,29.72-19.39h-22.48v-32.59s72.1,0,72.1,0Z';

const stackedPathManager =
  'M1000.42,346.35v28.51c-2.57-.2-4.55-.4-6.93-.4-17.03,0-28.31,9.31-28.31,29.7v53.39h-30.89v-109.62h29.5v14.06c7.52-10.3,20.2-15.64,36.63-15.64ZM923,349.45v88.7c0,39.6-21.38,57.81-59.79,57.81-20.2,0-39.8-4.95-52.27-14.65l12.28-22.17c9.11,7.33,23.96,12.08,37.62,12.08,21.78,0,31.28-9.9,31.28-29.1v-4.55c-8.12,8.91-19.8,13.27-33.66,13.27-29.5,0-53.26-20.39-53.26-51.48s23.76-51.48,53.26-51.48c14.85,0,27.12,4.95,35.24,15.25v-13.66h29.3ZM892.51,399.34c0-15.64-11.68-26.14-27.92-26.14s-28.11,10.49-28.11,26.14,11.88,26.14,28.11,26.14,27.92-10.49,27.92-26.14ZM792.85,395.19v62.37h-28.91v-14.85c-5.74,9.7-16.83,14.85-32.47,14.85-24.95,0-39.8-13.86-39.8-32.27s13.27-31.88,45.74-31.88h24.55c0-13.27-7.92-20.99-24.55-20.99-11.29,0-22.97,3.76-30.69,9.9l-11.09-21.58c11.68-8.32,28.91-12.87,45.93-12.87,32.47,0,51.28,15.05,51.28,47.32ZM761.97,422.31v-10.89h-21.18c-14.45,0-19.01,5.34-19.01,12.47,0,7.72,6.53,12.87,17.42,12.87,10.3,0,19.2-4.75,22.77-14.45ZM681.6,394.99v62.57h-30.89v-57.82c0-17.23-7.92-25.14-21.58-25.14-14.85,0-25.54,9.11-25.54,28.71v54.25h-30.89v-109.69s29.5,0,29.5,0v14.06c8.32-9.11,20.79-14.06,35.24-14.06,25.14,0,44.15,14.65,44.15,47.12ZM562.27,395.19v62.37h-28.91v-14.85c-5.74,9.7-16.83,14.85-32.47,14.85-24.95,0-39.8-13.86-39.8-32.27s13.27-31.88,45.74-31.88h24.55c0-13.27-7.92-20.99-24.55-20.99-11.29,0-22.97,3.76-30.69,9.9l-11.09-21.58c11.68-8.32,28.91-12.87,45.93-12.87,32.47,0,51.28,15.05,51.28,47.32ZM531.38,422.31v-10.89h-21.18c-14.45,0-19.01,5.34-19.01,12.47,0,7.72,6.53,12.87,17.42,12.87,10.3,0,19.2-4.75,22.77-14.45ZM419.65,457.56l-.2-83.16-40.79,68.51h-14.45l-40.59-66.72v81.37h-30.09v-138.59h26.53l51.87,86.13,51.08-86.13h26.33l.4,138.59h-30.09ZM166.01,402.61c0-32.08,24.75-54.84,58.61-54.84s58.41,22.77,58.41,54.84-24.55,54.84-58.41,54.84-58.61-22.77-58.61-54.84ZM251.74,402.61c0-18.41-11.68-29.5-27.13-29.5s-27.32,11.09-27.32,29.5,11.88,29.5,27.32,29.5,27.13-11.09,27.13-29.5ZM125.95,383.6h29.3v56.23c-15.25,11.48-36.23,17.62-56.03,17.62-43.56,0-75.63-29.9-75.63-71.67s32.08-71.67,76.23-71.67c24.35,0,44.55,8.32,58.01,23.96l-20.59,19.01c-10.1-10.69-21.78-15.64-35.84-15.64-26.93,0-45.34,18.02-45.34,44.35s18.41,44.35,44.94,44.35c8.71,0,16.83-1.58,24.95-5.94v-40.59Z';
const stackedPathG =
  'M725.95,137.44c0,76.33-53.66,129.99-130,129.99-14.17,0-27.52-1.83-39.88-5.31v-80.09c8.97,14.22,22.86,22.29,40.27,22.29,30.99,0,51.39-26.83,51.39-68.02s-20.02-69.17-51.77-69.17c-18.68,0-33.35,9.53-42.12,26.03-5.28-25.46-17.92-48.24-35.59-66.01,21.03-14.82,47.52-23.13,77.71-23.13,78.23,0,130,53.29,130,133.41Z';
const stackedPathO =
  'M546.7,130.97v136.45s-58.58,0-58.58,0v-21.34c-19.77,14.34-44.67,21.34-70.65,21.34-69.17,0-119.42-55.54-119.42-131.51S349.44,4.05,424.65,4.05c61.97,0,107.32,36.28,117.15,92.96l-74.83,1.5c-5.29-20.02-20.4-31.35-41.57-31.35-31.37,0-49.12,24.18-49.12,66.88,0,47.23,19.27,72.94,54.41,72.94,21.17,0,37.03-10.2,43.46-28.35h-32.87v-47.65s105.43,0,105.43,0Z';

function InlineLogoSvg({ className = '', wordmarkLight, ...rest }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial state
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for changes to dark mode class
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Use light color if wordmarkLight prop is true OR if dark mode is active
  const managerFill = wordmarkLight || isDarkMode 
    ? (wordmarkLight ? 'rgb(var(--color-primary-100))' : MANAGER_LIGHT)
    : MANAGER_DARK;
    
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 488.7"
      className={className}
      fill="none"
      aria-hidden
      {...rest}
    >
      <path d={inlinePathManager} fill={managerFill} />
      <path d={inlinePathG} fill="rgb(var(--color-secondary-600))" />
      <path d={inlinePathO} fill="rgb(var(--color-primary-500))" />
    </svg>
  );
}

function StackedLogoSvg({ className = '', wordmarkLight, ...rest }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial state
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for changes to dark mode class
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Use light color if wordmarkLight prop is true OR if dark mode is active
  const managerFill = wordmarkLight || isDarkMode 
    ? (wordmarkLight ? 'rgb(var(--color-primary-100))' : MANAGER_LIGHT)
    : MANAGER_DARK;
    
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 500"
      className={className}
      fill="none"
      aria-hidden
      {...rest}
    >
      <path d={stackedPathManager} fill={managerFill} />
      <path d={stackedPathG} fill="rgb(var(--color-secondary-600))" />
      <path d={stackedPathO} fill="rgb(var(--color-primary-500))" />
    </svg>
  );
}

const defaultInlineClass = 'h-11 w-auto max-md:h-8 flex-shrink-0';

export default function Logo({ variant = 'inline', href, className = '', tagline, wordmarkLight, inlineClassName }) {
  const inlineSvgClass = inlineClassName ? `${inlineClassName} w-auto flex-shrink-0` : defaultInlineClass;
  const inlineContent = (
    <InlineLogoSvg className={inlineSvgClass} wordmarkLight={wordmarkLight} />
  );

  const stackedSvgContent = (
    <StackedLogoSvg
      className="w-56 h-auto mx-auto block"
      style={{ maxWidth: 'min(100%, 280px)' }}
      wordmarkLight={wordmarkLight}
    />
  );

  const stackedContent = (
    <div className="text-center mb-8 animate-fade-in">
      {stackedSvgContent}
      {tagline && <p className="text-primary-200/80 text-sm mt-2">{tagline}</p>}
    </div>
  );

  const inlineWrapperClass = `flex flex-row items-center max-md:flex-col max-md:items-center ${className}`.trim();

  // Responsive: stacked on md and below, inline on lg and up
  if (variant === 'responsive') {
    const stackedBlock = (
      <div className="text-center">
        <StackedLogoSvg
          className="w-24 h-auto mx-auto block"
          style={{ maxWidth: 'min(100%, 220px)' }}
          wordmarkLight={wordmarkLight}
        />
      </div>
    );
    const content = (
      <>
        <span className="md:hidden">{href ? <Link href={href}>{stackedBlock}</Link> : stackedBlock}</span>
        <span className="hidden md:block">
          {href ? (
            <Link href={href} className={inlineWrapperClass}>
              {inlineContent}
            </Link>
          ) : (
            <span className={inlineWrapperClass}>{inlineContent}</span>
          )}
        </span>
      </>
    );
    return <div className={className}>{content}</div>;
  }

  if (variant === 'stacked') {
    return <div className={className}>{stackedContent}</div>;
  }

  if (href) {
    return (
      <Link href={href} className={inlineWrapperClass}>
        {inlineContent}
      </Link>
    );
  }

  return <span className={inlineWrapperClass}>{inlineContent}</span>;
}
