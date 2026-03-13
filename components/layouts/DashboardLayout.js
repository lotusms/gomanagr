import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserOrganization } from '@/services/organizationService';
import { isOwnerRole, isOwnerOrDeveloperRole } from '@/config/rolePermissions';
import { getOrgTrialStatus } from '@/lib/trialUtils';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import UserMenu from '@/components/layouts/UserMenu';
import DashboardSidebar from '@/components/layouts/DashboardSidebar';
import { PATH_TO_SECTION } from '@/config/teamMemberAccess';

const SIDEBAR_STORAGE_KEY = 'gomanagr-sidebar-open';
const MD_BREAKPOINT = 768;
const USER_KICKED_EVENT = 'user-kicked';

function getInitialSidebarOpen() {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  if (width < MD_BREAKPOINT) return false;
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
  const { account: userAccount, preview: previewAccount, setAccount, setPreview, loading: accountLoading } = useUserAccount();
  const accountLoaded = !accountLoading;
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);
  const [organization, setOrganization] = useState(null);
  const [orgLoaded, setOrgLoaded] = useState(false);
  const [orgFetchFailed, setOrgFetchFailed] = useState(false);
  const [memberAccess, setMemberAccess] = useState(null);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') sessionStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch (_) {}
  }, [sidebarOpen]);

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
    setOrgLoaded(false);
    setOrgFetchFailed(false);
    getUserOrganization(currentUser.uid)
      .then((org) => {
        setOrgFetchFailed(false);
        setOrganization(org || null);
      })
      .catch(() => {
        setOrgFetchFailed(true);
      })
      .finally(() => setOrgLoaded(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.uid) return;
    const onOrgUpdated = () => {
      getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null));
    };
    window.addEventListener('organization-updated', onOrgUpdated);
    return () => window.removeEventListener('organization-updated', onOrgUpdated);
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!orgLoaded || orgFetchFailed || !currentUser?.uid || organization !== null) return;
    (async () => {
      await logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?revoked=1';
      } else {
        router.replace('/login?revoked=1');
      }
    })();
  }, [orgLoaded, orgFetchFailed, currentUser?.uid, organization, logout, router]);

  useEffect(() => {
    const orgId = organization?.id;
    const uid = currentUser?.uid;
    if (!orgId || !uid) return;
    const channel = supabase.channel(`org:${orgId}`);
    channel
      .on('broadcast', { event: USER_KICKED_EVENT }, ({ payload }) => {
        if (payload?.userId === uid) {
          logoutRef.current().then(() => {
            if (typeof window !== 'undefined') window.location.href = '/login?revoked=1';
          });
        }
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [organization?.id, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || organization === null) return;
    const interval = setInterval(async () => {
      try {
        const org = await getUserOrganization(currentUser.uid);
        if (org == null) {
          await logout();
          if (typeof window !== 'undefined') window.location.href = '/login?revoked=1';
        } else {
          setOrganization(org);
        }
      } catch (_) {}
    }, 8 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.uid, organization, logout]);

  const memberRole = organization?.membership?.role;
  const isOwner = useMemo(
    () =>
      isOwnerRole(memberRole) ||
      (userAccount?.teamMembers || []).some((m) => m.id === `owner-${currentUser?.uid}`),
    [memberRole, userAccount?.teamMembers, currentUser?.uid]
  );
  const isOwnerOrDeveloper = useMemo(() => isOwnerOrDeveloperRole(memberRole), [memberRole]);

  useEffect(() => {
    if (!currentUser?.uid || memberRole !== 'member') return;
    fetch('/api/get-org-member-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setMemberAccess(data?.teamMemberSections || null))
      .catch(() => setMemberAccess(null));
  }, [currentUser?.uid, memberRole]);

  useEffect(() => {
    if (!orgLoaded || router.pathname !== '/dashboard') return;
    if (isOwner || isOwnerOrDeveloper) return;
    router.replace('/dashboard/team-member');
  }, [orgLoaded, router.pathname, isOwner, isOwnerOrDeveloper, router]);

  // Trial: superadmin/owner only — when org trial expired, send to paywall. Team members are grandfathered.
  const TEMPORARILY_BYPASS_TRIAL_FOR_SUPERADMIN = true; // TODO: set to false after testing
  const orgTrialStatus = useMemo(
    () => (organization ? getOrgTrialStatus(organization) : { expired: false }),
    [organization]
  );
  const paywallAllowlist = ['/dashboard/subscriptions'];
  const isOnPaywallAllowlist = paywallAllowlist.some(
    (p) => router.pathname === p || router.pathname.startsWith(p + '/')
  );
  useEffect(() => {
    if (!orgLoaded || !organization || memberRole !== 'superadmin') return;
    if (TEMPORARILY_BYPASS_TRIAL_FOR_SUPERADMIN || !orgTrialStatus.expired || isOnPaywallAllowlist) return;
    router.replace('/paywall');
  }, [orgLoaded, organization, memberRole, orgTrialStatus.expired, isOnPaywallAllowlist, router]);

  useEffect(() => {
    if (memberRole !== 'member') return;
    const path = router.pathname;
    const baseAllowed =
      path === '/account' ||
      path.startsWith('/dashboard/team-member') ||
      path === '/dashboard/settings';
    if (baseAllowed) return;
    if (memberAccess === null) return;
    if (path === '/dashboard/services' || path.startsWith('/dashboard/services/')) return;
    let allowed = false;
    for (const [sectionPath, sectionKey] of Object.entries(PATH_TO_SECTION)) {
      if (path === sectionPath || path.startsWith(sectionPath + '/')) {
        // Tasks: allowed for members unless admin explicitly turned it off
        allowed = sectionKey === 'tasks' ? memberAccess?.[sectionKey] !== false : !!memberAccess?.[sectionKey];
        break;
      }
    }
    if (!allowed) {
      router.replace('/dashboard/team-member');
    }
  }, [memberRole, router.pathname, memberAccess]);

  useEffect(() => {
    const handlePreview = (e) => {
      setPreview(e.detail || null);
    };
    const handleUpdated = (e) => {
      if (!e.detail) return;
      const payload = e.detail.payload ?? (e.detail.type === 'useraccount-updated' ? undefined : e.detail);
      setAccount((prev) => ({ ...prev, ...(payload || e.detail) }));
    };
    window.addEventListener('useraccount-preview', handlePreview);
    window.addEventListener('useraccount-updated', handleUpdated);
    return () => {
      window.removeEventListener('useraccount-preview', handlePreview);
      window.removeEventListener('useraccount-updated', handleUpdated);
    };
  }, [setAccount, setPreview]);

  const handleLogout = async () => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
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
      <header className="z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center space-x-3">
            <Logo href="/" inlineClassName="h-16" />
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
              <span>Hello, </span>
              {accountLoaded && orgLoaded
                ? (getDisplayName(previewAccount || userAccount, currentUser?.email ?? '') || currentUser?.email)
                : null}
            </div>
            <UserMenu
              userAccount={userAccount}
              previewAccount={previewAccount}
              currentUser={currentUser}
              organization={organization}
              isOwner={isOwner}
              onLogout={handleLogout}
              headerReady={accountLoaded && orgLoaded}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        <DashboardSidebar open={sidebarOpen} onToggle={setSidebarOpen} userAccount={previewAccount || userAccount} organization={organization} memberRole={memberRole} memberAccess={memberAccess} isOwner={isOwner} orgLoaded={orgLoaded} />

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
