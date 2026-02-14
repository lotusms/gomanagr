import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/** Avatar content: logo image, or initials from account/email. */
function getAvatarContent(account, email = '') {
  const first = (account?.firstName ?? '').trim();
  const last = (account?.lastName ?? '').trim();
  const nameView = account?.nameView ?? 'full';
  const hasName = first || last;

  if (nameView === 'first' && first) return { text: first[0].toUpperCase() };
  if (nameView === 'last_first' && hasName) return { text: (last[0] + (first[0] || '')).toUpperCase() };
  if (hasName) return { text: (first[0] + (last[0] || '')).toUpperCase() };
  if (email) return { text: email[0].toUpperCase() };
  return { text: '?' };
}

/**
 * User avatar button and dropdown menu (Profile, My Account, Settings, Logout).
 * @param {Object} props
 * @param {Object} [props.userAccount] - User account data (companyLogo, nameView, firstName, lastName)
 * @param {Object} [props.previewAccount] - Preview overrides (e.g. from account form)
 * @param {Object} [props.currentUser] - Auth user (email)
 * @param {() => Promise<void>} props.onLogout - Called when Logout is clicked (e.g. signOut + redirect)
 */
export default function UserMenu({ userAccount, previewAccount, currentUser, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await onLogout?.();
  };

  const account = previewAccount ? { ...userAccount, ...previewAccount } : userAccount;
  const logoUrl = (userAccount?.companyLogo ?? '').trim();
  const avatar = getAvatarContent(account, currentUser?.email ?? '');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 ${
          logoUrl ? 'bg-white text-gray-900 hover:bg-gray-50' : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
        aria-label="User menu"
        aria-expanded={open}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">{avatar.text}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            My Account
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Settings
          </Link>
          <div className="border-t border-gray-200 my-1" />
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
