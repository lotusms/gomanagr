import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { createDismissTodoHandler } from '@/utils/dismissTodoHandler';
import { getUserOrganization, getOrganizationMembers } from '@/services/organizationService';
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
import WebsiteConsultationDialog from '@/components/dashboard/WebsiteConsultationDialog';

function getWelcomeName(account, email = '') {
  // Always prioritize firstName - this is what user entered during signup
  const first = (account?.firstName ?? '').trim();
  if (first) return first;
  // Only fall back to email handler if firstName is truly missing
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
    title: 'Add your organization logo',
    description: 'Pull your organization logo and brand into GoManagr to use on quotes, invoices, and job forms.',
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
    description: 'Request a consultation with LOTUS Marketing Solutions for a website integrated with GoManagr.',
    duration: '5 minutes',
    Icon: HiGlobe,
    href: null, // Opens consultation dialog instead of navigating
  },
];

function DashboardContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMemberCount, setTeamMemberCount] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setAccountLoaded(false);
    // Use getUserAccountFromServer to bypass cache and get fresh data
    import('@/services/userService').then(({ getUserAccountFromServer }) => {
      getUserAccountFromServer(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
        })
        .catch(() => setUserAccount(null))
        .finally(() => setAccountLoaded(true));
    });
    getUserOrganization(currentUser.uid)
      .then((org) => {
        setOrganization(org || null);
        if (org?.id) {
          getOrganizationMembers(org.id)
            .then((members) => setTeamMemberCount(members?.length ?? 0))
            .catch(() => setTeamMemberCount(0));
        } else {
          setTeamMemberCount(null);
        }
      })
      .catch(() => {
        setOrganization(null);
        setTeamMemberCount(null);
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
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);

  const handleDismissTodo = createDismissTodoHandler({
    userId: currentUser?.uid,
    dismissedTodoIds,
    onSuccess: (next) => setUserAccount((prev) => (prev ? { ...prev, dismissedTodoIds: next } : null)),
  });

  const todoItems =
    dismissedTodoIds === null
      ? []
      : TODO_ITEMS.filter((item) => {
          if (dismissedTodoIds.includes(item.id)) return false;
          // Hide "Add your organization logo" if org or user account already has a logo
          if (item.id === 'company-logo') {
            if (!accountLoaded) return true;
            const userLogo = (userAccount?.companyLogo != null && userAccount?.companyLogo !== '')
              ? String(userAccount.companyLogo).trim()
              : '';
            const orgLogo = (organization?.logo_url != null && organization?.logo_url !== '')
              ? String(organization.logo_url).trim()
              : '';
            if (userLogo.length > 0 || orgLogo.length > 0) return false;
          }
          // Show client-portal todo only when no clients created
          if (item.id === 'client-portal') {
            if (!accountLoaded) return true;
            const hasClients = Array.isArray(userAccount?.clients) && userAccount.clients.length > 0;
            if (hasClients) return false;
          }
          // Show invoicing todo only when no invoices created
          if (item.id === 'invoicing') {
            if (!accountLoaded) return true;
            const hasInvoices = Array.isArray(userAccount?.invoices) && userAccount.invoices.length > 0;
            if (hasInvoices) return false;
          }
          // Show quote todo only when no quotes created
          if (item.id === 'quote') {
            if (!accountLoaded) return true;
            const hasQuotes = Array.isArray(userAccount?.quotes) && userAccount.quotes.length > 0;
            if (hasQuotes) return false;
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

        <StatsGrid userAccount={userAccount} teamMemberCount={teamMemberCount} />

        <DashboardTodos
          items={todoItems}
          onDismiss={handleDismissTodo}
          onItemClick={(item) => item.id === 'website' && setWebsiteDialogOpen(true)}
        />
        <WebsiteConsultationDialog
          open={websiteDialogOpen}
          onClose={() => setWebsiteDialogOpen(false)}
          onSuccess={() => handleDismissTodo('website')}
          defaultEmail={currentUser?.email ?? ''}
          defaultName={[userAccount?.firstName, userAccount?.lastName].filter(Boolean).join(' ').trim()}
          defaultCompany={organization?.name ?? ''}
        />

        {/* Admin dashboard: all staff and all appointments for today */}
        <TodaysAppointments
          businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
          businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
          timeFormat={userAccount?.timeFormat ?? '24h'}
          dateFormat={userAccount?.dateFormat ?? 'MM/DD/YYYY'}
          timezone={userAccount?.timezone ?? 'UTC'}
          staff={userAccount?.teamMembers ?? []}
          appointments={userAccount?.appointments || []}
          clients={userAccount?.clients || []}
          services={userAccount?.services || []}
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
