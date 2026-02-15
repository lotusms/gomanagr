import { HiX } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';

/**
 * Card with avatar (photo or initials), name, and optional subtitle.
 * Used for team members and clients grids.
 * @param {string} name
 * @param {string} [subtitle]
 * @param {string} [src] - Avatar image URL (e.g. team member pictureUrl); when set, shows photo instead of initials
 * @param {() => void} [onClick] - If provided, card is clickable (e.g. open edit)
 * @param {() => void} [onRemove] - If provided, shows a remove button
 */
export default function PersonCard({ name, subtitle, src, onClick, onRemove }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`bg-white rounded-lg shadow border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow relative ${onClick ? 'cursor-pointer' : ''}`}
    >
      <Avatar src={src} name={name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Remove"
        >
          <HiX className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
