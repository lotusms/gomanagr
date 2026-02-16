import { HiX, HiUser } from 'react-icons/hi';

/**
 * Card with background image (or soft primary color if no image), name, and optional subtitle.
 * Used for team members and clients grids.
 * @param {string} name
 * @param {string} [subtitle]
 * @param {string} [src] - Image URL (e.g. team member pictureUrl); when set, shows as background
 * @param {() => void} [onClick] - If provided, card is clickable (e.g. open edit)
 * @param {() => void} [onRemove] - If provided, shows a remove button
 */
export default function PersonCard({ name, subtitle, src, onClick, onRemove }) {
  const hasImage = src && src.trim() !== '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`
        relative rounded-lg shadow-md border border-gray-200 overflow-hidden
        aspect-[4/3] min-h-[200px]
        ${hasImage ? '' : 'bg-primary-50'}
        hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-out
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={hasImage ? {
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      } : {}}
    >
      {/* Gradient overlay for text readability */}
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
      )}

      {/* Person silhouette icon when no image */}
      {!hasImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <HiUser className="w-24 h-24 text-primary-300 opacity-50" />
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="relative z-10">
          <p className={`font-semibold truncate ${hasImage ? 'text-white' : 'text-gray-900'}`}>
            {name}
          </p>
          {subtitle && (
            <p className={`text-sm truncate mt-1 ${hasImage ? 'text-white/90' : 'text-gray-600'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`
            absolute top-2 right-2 z-20 p-1.5 rounded-full transition-colors
            ${hasImage 
              ? 'text-white/80 hover:text-white hover:bg-black/30 bg-black/20 backdrop-blur-sm' 
              : 'text-red-400 hover:text-red-600 hover:bg-red-50'
            }
          `}
          aria-label="Remove"
        >
          <HiX className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
