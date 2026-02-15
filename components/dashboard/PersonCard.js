import { HiUser } from 'react-icons/hi';

/**
 * Card with avatar placeholder, name, and optional subtitle.
 * Used for team members and clients grids.
 */
export default function PersonCard({ name, subtitle }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
        <span className="text-sm font-medium">{initials || <HiUser className="w-6 h-6" />}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
