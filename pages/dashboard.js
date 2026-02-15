import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateDismissedTodos } from '@/services/userService';
import { DEFAULT_TEAM_MEMBERS } from '@/config/defaultTeamAndClients';
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

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
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
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null))
      .finally(() => setAccountLoaded(true));
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
          if (item.id === 'company-logo' && userAccount?.companyLogo) return false;
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
          <p className="text-sm text-gray-500 mb-1">{getFormattedDate()}</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Good {getTimeOfDay()}{welcomeName ? `, ${welcomeName}` : ''}
          </h1>
        </div>

        <StatsGrid />

        <DashboardTodos items={todoItems} onDismiss={handleDismissTodo} />

        <TodaysAppointments
          businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
          businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
          timeFormat={userAccount?.timeFormat ?? '24h'}
          staff={userAccount?.teamMembers ?? DEFAULT_TEAM_MEMBERS}
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
