import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { HiShieldCheck } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';
import { getDisplayName } from '@/lib/UserAccountContext';
import { isAdminOrDeveloper } from '@/lib/userPermissions';
import { isAdminRole, isMemberRole, isOwnerRole } from '@/config/rolePermissions';

/**
 * User avatar button and dropdown menu (My Account, Settings, Logout).
 * @param {Object} props
 * @param {Object} [props.userAccount] - User account data (companyLogo, nameView, firstName, lastName)
 * @param {Object} [props.previewAccount] - Preview overrides (e.g. from account form)
 * @param {Object} [props.currentUser] - Auth user (email)
 * @param {Object} [props.organization] - Organization data (logo_url)
 * @param {boolean} [props.isOwner] - Org creator; when true, show Subscriptions and Developer
 * @param {() => Promise<void>} props.onLogout - Called when Logout is clicked (e.g. signOut + redirect)
 * @param {boolean} [props.headerReady] - When true, account and org are loaded; show avatar. When false, show loading placeholder to avoid flash of initials before logo.
 */
export default function UserMenu({ userAccount, previewAccount, currentUser, organization, isOwner, onLogout, headerReady = true }) {
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
  const rawOrgLogo = organization?.logo_url;
  const rawUserLogo = account?.companyLogo;
  let logoUrl = '';
  if (rawOrgLogo !== null && rawOrgLogo !== undefined) {
    logoUrl = String(rawOrgLogo).trim();
  } else if (rawUserLogo !== null && rawUserLogo !== undefined) {
    logoUrl = String(rawUserLogo).trim();
  }
  const displayName = getDisplayName(account, currentUser?.email ?? '');
  const firstName = (account?.firstName ?? '').trim();
  const lastName = (account?.lastName ?? '').trim();
  const initialsName = firstName || lastName ? `${firstName} ${lastName}`.trim() : displayName;
  
  const hasLogo = logoUrl.length > 0;
  const accountLoaded = userAccount !== null || previewAccount !== null;
  const shouldShowAvatar = headerReady && accountLoaded;
  const shouldShowInitials = accountLoaded && !hasLogo;

  const memberRole = organization?.membership?.role;
  const isTeamMember = isMemberRole(memberRole);
  const isAdmin = isAdminRole(memberRole);
  const isSuperAdmin = isOwnerRole(memberRole);
  const canAccessDeveloper = accountLoaded && isAdminOrDeveloper(account, currentUser?.uid);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full flex items-center justify-center overflow-hidden font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 hover:opacity-90"
        aria-label="User menu"
        aria-expanded={open}
      >
        {shouldShowAvatar ? (
          <Avatar
            src={hasLogo ? logoUrl : undefined}
            name={shouldShowInitials ? initialsName : undefined}
            size="sm"
            className={!hasLogo ? 'bg-primary-600 text-white' : 'bg-white'}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100]">
          {isAdmin && (
            <div className="px-4 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              {isSuperAdmin ? (
                <>
                  <span className="flex items-center justify-center w-6 h-5 flex-shrink-0" aria-hidden>
                    <div className="relative inline-flex items-center justify-center">
                      <HiShieldCheck className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                      <HiShieldCheck className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                    </div>
                  </span>
                  Super Admin
                </>
              ) : (
                <>
                  <div className="flex relative items-center justify-center">
                    <HiShieldCheck className="w-4 h-4 text-primary-500 dark:text-primary-400 mr-1" />
                    Admin
                  </div>
                </>
              )}
            </div>
          )}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            My Account
          </Link>
          {isSuperAdmin && (
            <Link
              href="/dashboard/subscriptions"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Subscriptions
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Settings
            </Link>
          )}
          {isSuperAdmin && process.env.NODE_ENV === 'development' && canAccessDeveloper && (
            <Link
              href="/dashboard/developer"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Developer
            </Link>
          )}
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
