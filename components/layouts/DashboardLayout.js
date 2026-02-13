import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/client/lib/AuthContext';
import { getUserAccount, getUserAccountFromServer } from '@/client/services/userService';
import { HiFolder, HiUsers, HiCog } from 'react-icons/hi';
import { MdDashboard } from 'react-icons/md';

/** Format display name from account and nameView preference (saved in useraccount). */
function getDisplayName(account, email = '') {
  const first = (account?.firstName ?? '').trim();
  const last = (account?.lastName ?? '').trim();
  const nameView = account?.nameView ?? 'full';
  const hasName = first || last;

  switch (nameView) {
    case 'first':
      return first || email;
    case 'f_last':
      return hasName ? (first ? first[0] + '. ' : '') + last || email : email;
    case 'last_first':
      return hasName ? [last, first].filter(Boolean).join(', ') || email : email;
    case 'email':
      return email || '';
    case 'full':
    default:
      return hasName ? `${first} ${last}`.trim() : email;
  }
}

/** Avatar: logo if set, else initials by nameView. Default first+last initials. */
function getAvatarContent(account, email = '') {
  const logoUrl = (account?.companyLogo ?? '').trim();
  if (logoUrl) return { type: 'image', url: logoUrl };

  const first = (account?.firstName ?? '').trim();
  const last = (account?.lastName ?? '').trim();
  const nameView = account?.nameView ?? 'full';
  const hasName = first || last;
  const emailChar = (email || '?').charAt(0).toUpperCase();

  let text;
  switch (nameView) {
    case 'first':
      text = hasName && first ? first[0] : emailChar;
      break;
    case 'last_first':
      text = hasName ? (last ? last[0] : '') + (first ? first[0] : '') : emailChar;
      break;
    case 'f_last':
    case 'full':
    default:
      text = hasName ? (first ? first[0] : '') + (last ? last[0] : '') : emailChar;
      break;
    case 'email':
      text = emailChar;
      break;
  }
  text = (text || emailChar).toUpperCase();
  return { type: 'initials', text };
}

export default function DashboardLayout({ children, title = 'Dashboard' }) {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userAccount, setUserAccount] = useState(null);
  const [previewAccount, setPreviewAccount] = useState(null);
  const dropdownRef = useRef(null);

  const fetchUserAccount = (fromServer = false) => {
    if (!currentUser?.uid) return;
    const fetch = fromServer ? getUserAccountFromServer : getUserAccount;
    fetch(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
  };

  // Load user account so header shows correct display name
  useEffect(() => {
    fetchUserAccount(false);
  }, [currentUser?.uid, router.asPath]);

  // Clear preview when not on Account page
  useEffect(() => {
    if (router.pathname !== '/account') setPreviewAccount(null);
  }, [router.pathname]);

  // Live preview: Account page sends current form state so header updates as user changes dropdown/name
  useEffect(() => {
    const onPreview = (e) => setPreviewAccount(e.detail || null);
    window.addEventListener('useraccount-preview', onPreview);
    return () => window.removeEventListener('useraccount-preview', onPreview);
  }, []);

  // On save: use payload from event so header updates immediately; then refetch from server
  useEffect(() => {
    const onSaved = (e) => {
      const payload = e.detail;
      if (payload && typeof payload === 'object') {
        setUserAccount((prev) => ({ ...prev, ...payload }));
      }
      setPreviewAccount(null);
      if (currentUser?.uid) {
        getUserAccountFromServer(currentUser.uid)
          .then((data) => data && setUserAccount(data))
          .catch(() => {});
      }
    };
    window.addEventListener('useraccount-updated', onSaved);
    return () => window.removeEventListener('useraccount-updated', onSaved);
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      setDropdownOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: MdDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: HiFolder },
    { name: 'Team', href: '/dashboard/team', icon: HiUsers },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen relative overflow-hidden">
      {/* Same grid background as public pages */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GoManagr</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-sm text-gray-600">
              <span>Hello, </span>
              {getDisplayName(previewAccount || userAccount, currentUser?.email ?? '') || currentUser?.email}
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0 ${
                  (userAccount?.companyLogo ?? '').trim()
                    ? 'bg-white text-gray-900 hover:bg-gray-50'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
                aria-label="User menu"
                aria-expanded={dropdownOpen}
              >
                {(() => {
                  const account = previewAccount ? { ...userAccount, ...previewAccount } : userAccount;
                  const logoUrl = (userAccount?.companyLogo ?? '').trim();
                  if (logoUrl) {
                    return <img src={logoUrl} alt="" className="w-full h-full object-cover" />;
                  }
                  const avatar = getAvatarContent(account, currentUser?.email ?? '');
                  return <span className="text-sm">{avatar.text}</span>;
                })()}
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    My Account
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Settings
                  </Link>
                  <div className="border-t border-gray-200 my-1"></div>
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
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed top-16 bottom-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out w-64 ${
            sidebarOpen 
              ? 'lg:translate-x-0 lg:fixed lg:top-16 lg:bottom-0 lg:w-64' 
              : 'lg:translate-x-0 lg:fixed lg:top-16 lg:bottom-0 lg:w-16'
          }`}
        >
          {/* Collapse Handle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-4 h-10 bg-white border border-gray-300 rounded-tr-lg rounded-br-lg shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center group hover:bg-gray-50 z-50 ml-2 cursor-pointer"
            aria-label="Toggle sidebar">
            <div className="flex flex-col gap-1">
              <div className="size-1 rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300"></div>
              <div className="size-1 rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300"></div>
              <div className="size-1 rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300"></div>
            </div>
          </button>
          
          <div className="h-full overflow-y-auto overflow-x-hidden">

          <nav className={`py-6 space-y-2 transition-all duration-300 ${sidebarOpen ? 'px-4' : 'lg:px-2'}`}>
            {navigation.map((item) => {
              const isActive = router.pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center rounded-lg transition-all duration-300 ${
                    sidebarOpen ? 'space-x-3 px-4 py-3' : 'lg:justify-center lg:px-2 lg:py-3'
                  } ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={!sidebarOpen ? item.name : ''}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${
                    sidebarOpen ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'
                  }`}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} transition-all duration-300 overflow-y-auto h-full`}>
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
