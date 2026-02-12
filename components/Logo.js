import Link from 'next/link';

/**
 * Logo component with inline (default) and stacked variants.
 * @param {Object} props
 * @param {'inline'|'stacked'} props.variant - 'inline' (icon + text side by side) or 'stacked' (icon above text, centered)
 * @param {string} [props.href] - When provided, wraps in Link (e.g. href="/" for nav/footer)
 * @param {string} [props.className] - Optional class for the root wrapper
 * @param {string} [props.tagline] - Optional tagline below the wordmark (stacked variant only)
 */
export default function Logo({ variant = 'inline', href, className = '', tagline }) {
  const inlineContent = (
    <>
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-purple-900 font-bold text-xl">G</span>
      </div>
      <span className="text-white text-xl font-semibold">GoManagr</span>
    </>
  );

  const stackedContent = (
    <div className="text-center mb-8 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white to-purple-100 rounded-2xl shadow-2xl mb-4 transform hover:scale-110 transition-transform duration-300">
        <span className="text-purple-900 font-bold text-6xl">G</span>
      </div>
      <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
        GoManagr
      </h1>
      {tagline && <p className="text-purple-200/80 text-sm">{tagline}</p>}
    </div>
  );

  const inlineWrapperClass = `flex items-center space-x-2 ${className}`.trim();

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
