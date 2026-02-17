import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateDismissedTodos } from '@/services/userService';
import { DEFAULT_TEAM_MEMBERS } from '@/config/defaultTeamAndClients';
import { formatDate } from '@/utils/dateTimeFormatters';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  HiClipboardList,
  HiOfficeBuilding,
  HiGlobe,
  HiCurrencyDollar,
  HiUserGroup,
} from 'react-icons/hi';
import TodaysAppointments from '@/components/dashboard/TodaysAppointments';
import DashboardTodos from '@/components/dashboard/DashboardTodos';
import StatsGrid from '@/components/dashboard/StatsGrid';

function getWelcomeName(account, email = '') {
  const first = (account?.firstName ?? '').trim();
  if (first) return first;
  if (email) return email.split('@')[0];
  return '';
}

function getFormattedDate(dateFormat = 'MM/DD/YYYY', timezone = 'UTC') {
  const todayInTimezone = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  // For welcome message, use a friendly format regardless of user preference
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const TODO_ITEMS = [
  {
    id: 'company-logo',
    title: 'Add your company logo',
    description: 'Pull your company logo and brand into GoManagr to use on quotes, invoices, and job forms.',
    duration: '2 minutes',
    Icon: HiOfficeBuilding,
    href: '/dashboard/settings', // Organization settings (logo) is the default section
  },
  {
    id: 'client-portal',
    title: 'Explore your personalized online client portal',
    description: 'Clients can approve quotes, review jobs, and pay all online.',
    duration: '5 minutes',
    Icon: HiUserGroup,
    href: '/dashboard/clients',
  },
  {
    id: 'invoicing',
    title: 'Get paid with fast invoicing',
    description: 'Create and send invoices your clients can pay online.',
    duration: '2 minutes',
    Icon: HiClipboardList,
    href: '/dashboard/invoices',
  },
  {
    id: 'quote',
    title: 'Create a winning quote',
    description: 'Boost your revenue with custom quotes.',
    duration: '2 minutes',
    Icon: HiCurrencyDollar,
    href: '/dashboard/quotes',
  },
  {
    id: 'website',
    title: 'Create a website for your business',
    description: 'Apply for a website that will be integrated with GoManagr and get your business online.',
    duration: '5 minutes',
    Icon: HiGlobe,
    href: '/dashboard/website',
  },
];

function DashboardContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setAccountLoaded(false);
    // Use getUserAccountFromServer to bypass cache and get fresh data
    import('@/services/userService').then(({ getUserAccountFromServer }) => {
      getUserAccountFromServer(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
          // Debug: log companyLogo value
          if (data) {
            console.log('[Dashboard] Loaded account data:', {
              hasCompanyLogo: !!data.companyLogo,
              companyLogoType: typeof data.companyLogo,
              companyLogoValue: data.companyLogo ? String(data.companyLogo).substring(0, 50) : 'empty/null',
              companyLogoLength: data.companyLogo ? String(data.companyLogo).length : 0
            });
          }
        })
        .catch(() => setUserAccount(null))
        .finally(() => setAccountLoaded(true));
    });
  }, [currentUser?.uid]);

  // Listen for account updates (e.g., when logo is saved)
  useEffect(() => {
    const handleAccountUpdate = async (e) => {
      if (e.detail?.type === 'useraccount-updated' && currentUser?.uid) {
        // Refresh account data from server to get latest logo
        try {
          const { getUserAccountFromServer } = await import('@/services/userService');
          const updatedData = await getUserAccountFromServer(currentUser.uid);
          if (updatedData) {
            setUserAccount(updatedData);
          }
        } catch (err) {
          console.error('Failed to refresh account data:', err);
        }
      }
    };
    window.addEventListener('useraccount', handleAccountUpdate);
    return () => window.removeEventListener('useraccount', handleAccountUpdate);
  }, [currentUser?.uid]);

  const welcomeName = getWelcomeName(userAccount, currentUser?.email ?? '');
  const dismissedTodoIds = accountLoaded ? (userAccount?.dismissedTodoIds ?? []) : null;

  const handleDismissTodo = (todoId) => {
    if (!currentUser?.uid || !todoId) return;
    const next = dismissedTodoIds.includes(todoId)
      ? dismissedTodoIds
      : [...dismissedTodoIds, todoId];
    updateDismissedTodos(currentUser.uid, next)
      .then(() => setUserAccount((prev) => (prev ? { ...prev, dismissedTodoIds: next } : null)))
      .catch((err) => console.error('Failed to dismiss todo:', err));
  };

  const todoItems =
    dismissedTodoIds === null
      ? []
      : TODO_ITEMS.filter((item) => {
          if (dismissedTodoIds.includes(item.id)) return false;
          // Check if company logo exists and is not empty
          if (item.id === 'company-logo') {
            // Only check if account has loaded
            if (!accountLoaded || !userAccount) return true; // Show todo if account not loaded yet
            
            const rawLogo = userAccount.companyLogo;
            // Handle various cases: string, null, undefined, empty string, whitespace
            let logoUrl = '';
            if (rawLogo !== null && rawLogo !== undefined) {
              logoUrl = String(rawLogo).trim();
            }
            const hasLogo = logoUrl.length > 0;
            
            // Hide todo if logo exists
            if (hasLogo) return false;
          }
          return true;
        });

  return (
    <>
      <Head>
        <title>Dashboard - GoManagr</title>
        <meta name="description" content="Your dashboard" />
      </Head>

      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {getFormattedDate(userAccount?.dateFormat, userAccount?.timezone)}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Good {getTimeOfDay()}{welcomeName ? `, ${welcomeName}` : ''}
          </h1>
        </div>

        <StatsGrid />

        <DashboardTodos items={todoItems} onDismiss={handleDismissTodo} />

        <TodaysAppointments
          businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
          businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
          timeFormat={userAccount?.timeFormat ?? '24h'}
          dateFormat={userAccount?.dateFormat ?? 'MM/DD/YYYY'}
          timezone={userAccount?.timezone ?? 'UTC'}
          staff={userAccount?.teamMembers ?? DEFAULT_TEAM_MEMBERS}
          appointments={userAccount?.appointments || []}
        />
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
