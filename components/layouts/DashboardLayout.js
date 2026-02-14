import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/client/lib/AuthContext';
import { getUserAccount, getUserAccountFromServer } from '@/client/services/userService';
import { HiFolder, HiUsers } from 'react-icons/hi';
import { MdDashboard } from 'react-icons/md';
import Logo from '@/components/Logo';

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

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Default: expanded on lg+, collapsed on md and below (set once on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);
  const [userAccount, setUserAccount] = useState(null);
  const [previewAccount, setPreviewAccount] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    const handle = (e) => {
      if (e.detail?.type === 'useraccount-preview') setPreviewAccount(e.detail.payload || null);
      if (e.detail?.type === 'useraccount-updated') {
        setPreviewAccount(null);
        if (e.detail?.payload) setUserAccount((prev) => ({ ...prev, ...e.detail.payload }));
      }
    };
    window.addEventListener('useraccount', handle);
    return () => window.removeEventListener('useraccount', handle);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: MdDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: HiFolder },
    { name: 'Team', href: '/dashboard/team', icon: HiUsers },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen relative overflow-hidden">
      {/* Same grid background as public pages */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center space-x-3">
            <Logo href="/" inlineClassName="h-16" />
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

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]">
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
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - always visible: collapsed (icons only) or expanded on all screens */}
        <aside
          className={`translate-x-0 fixed top-16 bottom-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-4 h-10 bg-white border border-gray-300 rounded-tr-lg rounded-br-lg shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center group hover:bg-gray-50 z-50 ml-2 cursor-pointer"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <div className="flex flex-col gap-1">
              <div className="size-1 rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300" />
              <div className="size-1 rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300" />
              <div className="size-1 rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300" />
            </div>
          </button>

          <div className="h-full overflow-y-auto overflow-x-hidden">
            <nav className={`py-6 space-y-2 transition-all duration-300 ${sidebarOpen ? 'px-4' : 'px-2'}`}>
              {navigation.map((item) => {
                const isActive = router.pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center rounded-lg transition-all duration-300 ${
                      sidebarOpen ? 'space-x-3 px-4 py-3' : 'justify-center px-2 py-3'
                    } ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={!sidebarOpen ? item.name : ''}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <span
                      className={`whitespace-nowrap transition-opacity duration-200 ${
                        sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300 overflow-y-auto h-full`}
        >
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
