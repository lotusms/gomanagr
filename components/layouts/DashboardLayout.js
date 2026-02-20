import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import Logo from '@/components/Logo';
import UserMenu from '@/components/layouts/UserMenu';
import DashboardSidebar from '@/components/layouts/DashboardSidebar';

const SIDEBAR_STORAGE_KEY = 'gomanagr-sidebar-open';
const MD_BREAKPOINT = 768;

function getInitialSidebarOpen() {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  // sm and below: always default collapsed (don't use stored value)
  if (width < MD_BREAKPOINT) return false;
  // md and above: restore from storage, or default open
  try {
    const stored = sessionStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch (_) {}
  return true;
}

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

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);
  const [userAccount, setUserAccount] = useState(null);
  const [previewAccount, setPreviewAccount] = useState(null);
  const [organization, setOrganization] = useState(null);

  // Persist sidebar state so it survives layout remounts on navigation (md+ stays open/closed as-is)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') sessionStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch (_) {}
  }, [sidebarOpen]);

  // On resize: collapse when going to sm and below, open when going back to md and above
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < MD_BREAKPOINT) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
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

  const handleLogout = async () => {
    try {
      // Remove dark mode before logging out
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure dark mode is removed even if logout fails
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
      // Still redirect even if logout fails
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col h-screen relative overflow-hidden">
      {/* Same grid background as public pages */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center space-x-3">
            <Logo href="/" inlineClassName="h-16" />
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
              <span>Hello, </span>
              {(() => {
                const account = previewAccount || userAccount;
                // Prioritize firstName for greeting
                const firstName = (account?.firstName ?? '').trim();
                if (firstName) return firstName;
                // Fall back to formatted display name or email
                return getDisplayName(account, currentUser?.email ?? '') || currentUser?.email;
              })()}
            </div>
            <UserMenu
              userAccount={userAccount}
              previewAccount={previewAccount}
              currentUser={currentUser}
              organization={organization}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        <DashboardSidebar open={sidebarOpen} onToggle={setSidebarOpen} userAccount={previewAccount || userAccount} />

        {/* Main Content */}
        <main
          className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300 overflow-y-auto h-full bg-gray-50 dark:bg-gray-900`}
        >
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
