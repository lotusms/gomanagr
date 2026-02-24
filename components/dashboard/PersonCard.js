import { HiTrash, HiUser, HiOfficeBuilding, HiShieldCheck, HiMail, HiLockClosed } from 'react-icons/hi';
import { useMemo } from 'react';

const iconButtonClass = `
  absolute top-3 z-20 p-2 rounded-full
  bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm
  shadow-lg hover:shadow-xl transition-all duration-200
  opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100
`;

/**
 * Modern, vibrant card with gradient background, prominent avatar, and clean typography.
 * Used for team members and clients grids.
 * @param {() => void} [onInvite] - If provided, shows an invite button (team member card)
 * @param {() => void} [onRevoke] - If provided, shows a revoke access button (team member card)
 */
export default function PersonCard({ name, subtitle, src, onClick, onRemove, onInvite, onRevoke, isClient = false, hasCompany = false, isAdmin = false, isSuperAdmin = false }) {
  const hasImage = src && src.trim() !== '';
  const initials = useMemo(() => {
    if (isClient) return null;
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [name, isClient]);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`
        group relative rounded-2xl overflow-hidden
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        shadow-lg hover:shadow-2xl
        transition-all duration-300 ease-out
        hover:scale-[1.03] hover:-translate-y-1
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

      <div className="relative z-10 flex flex-col items-center justify-center p-6 min-h-[200px]">
        <div className="mb-4 relative">
          {isClient ? (
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              bg-white/20 backdrop-blur-sm
              ring-4 ring-white/30 dark:ring-gray-800/30
              shadow-xl
              text-white
              group-hover:scale-110 transition-transform duration-300
            `}>
              {hasCompany ? (
                <HiOfficeBuilding className="w-10 h-10" />
              ) : (
                <HiUser className="w-10 h-10" />
              )}
            </div>
          ) : hasImage ? (
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/30 dark:ring-gray-800/30 shadow-xl">
              <img 
                src={src} 
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              bg-white/20 backdrop-blur-sm
              ring-4 ring-white/30 dark:ring-gray-800/30
              shadow-xl
              text-white text-2xl font-bold
              group-hover:scale-110 transition-transform duration-300
            `}>
              {initials}
            </div>
          )}
          <div className="absolute -inset-2 rounded-full border-2 border-white/20 dark:border-gray-700/20 animate-pulse" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-1 px-2 w-full">
          <h3 className="text-xl font-bold text-white text-center truncate drop-shadow-lg">
            {name}
          </h3>
          {isSuperAdmin && (
            <span className="flex items-center justify-center w-6 h-5 flex-shrink-0" title="Super Admin" aria-label="Super Admin">
              <div className="relative inline-flex items-center justify-center ml-2">
                <HiShieldCheck className="w-5 h-5 text-white drop-shadow-lg" aria-hidden />
                <HiShieldCheck className="w-5 h-5 text-white/90 drop-shadow-lg" aria-hidden />
              </div>
            </span>
          )}
          {isAdmin && !isSuperAdmin && (
            <HiShieldCheck 
              className="w-5 h-5 text-white flex-shrink-0 drop-shadow-lg" 
              title="Admin"
              aria-label="Admin"
            />
          )}
        </div>

        {subtitle && (
          <div className="flex items-center gap-1.5 text-white/90 text-sm mt-1">
            <HiOfficeBuilding className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[200px] drop-shadow-md">{subtitle}</span>
          </div>
        )}
      </div>

      {onInvite && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onInvite(); }}
          className={`left-3 text-primary-600 hover:text-primary-700 hover:bg-white dark:hover:bg-gray-700 ${iconButtonClass}`}
          aria-label="Invite to join"
          title="Invite to join"
        >
          <HiMail className="w-5 h-5" />
        </button>
      )}
      {onRevoke && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRevoke(); }}
          className={`left-3 text-amber-600 hover:text-amber-700 hover:bg-white dark:hover:bg-gray-700 ${iconButtonClass} ${onInvite ? 'left-12' : ''}`}
          aria-label="Revoke access"
          title="Revoke access"
        >
          <HiLockClosed className="w-5 h-5" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`right-3 text-red-500 hover:text-red-600 hover:bg-white dark:hover:bg-gray-700 ${iconButtonClass}`}
          aria-label="Remove"
        >
          <HiTrash className="w-5 h-5" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 dark:bg-gray-700/30" />
    </div>
  );
}
