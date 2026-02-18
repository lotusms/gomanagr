import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { getDisplayName } from '@/lib/UserAccountContext';

/**
 * User avatar button and dropdown menu (My Account, Settings, Logout).
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
  // Get logo URL and ensure it's a valid non-empty string
  const rawLogo = account?.companyLogo;
  // Handle all possible cases: string, null, undefined, number, etc.
  let logoUrl = '';
  if (rawLogo !== null && rawLogo !== undefined) {
    logoUrl = String(rawLogo).trim();
  }
  const displayName = getDisplayName(account, currentUser?.email ?? '');
  
  const hasLogo = logoUrl.length > 0;
  const accountLoaded = userAccount !== null || previewAccount !== null;
    
  const shouldShowInitials = accountLoaded && !hasLogo;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full flex items-center justify-center overflow-hidden font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 hover:opacity-90"
        aria-label="User menu"
        aria-expanded={open}
      >
        {accountLoaded ? (
          <Avatar
            src={hasLogo ? logoUrl : undefined}
            name={shouldShowInitials ? displayName : undefined}
            size="sm"
            className={!hasLogo ? 'bg-primary-600 text-white' : 'bg-white'}
          />
        ) : (
          // Show a placeholder while loading to prevent flash
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100]">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            My Account
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Settings
          </Link>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
