import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateDismissedTodos } from '@/services/userService';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  HiFolder,
  HiClipboardList,
  HiUsers,
  HiCheckCircle,
  HiOfficeBuilding,
  HiGlobe,
  HiCurrencyDollar,
  HiX,
  HiUserGroup,
  HiReceiptTax,
  HiDocumentText,
} from 'react-icons/hi';

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

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  const welcomeName = getWelcomeName(userAccount, currentUser?.email ?? '');
  const dismissedTodoIds = userAccount?.dismissedTodoIds ?? [];

  const handleDismissTodo = (todoId) => {
    if (!currentUser?.uid || !todoId) return;
    const next = dismissedTodoIds.includes(todoId)
      ? dismissedTodoIds
      : [...dismissedTodoIds, todoId];
    updateDismissedTodos(currentUser.uid, next)
      .then(() => setUserAccount((prev) => (prev ? { ...prev, dismissedTodoIds: next } : null)))
      .catch((err) => console.error('Failed to dismiss todo:', err));
  };

  // Hide "Add your company logo" when user already has a logo; hide any dismissed todos
  const todoItems = TODO_ITEMS.filter((item) => {
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Projects', value: '12', change: '+2', color: 'bg-blue-500', Icon: HiFolder },
            { title: 'Active Tasks', value: '8', change: '+3', color: 'bg-green-500', Icon: HiClipboardList },
            { title: 'Team Members', value: '24', change: '+1', color: 'bg-primary-500', Icon: HiUsers },
            { title: 'Completed', value: '156', change: '+12', color: 'bg-orange-500', Icon: HiCheckCircle },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white`}>
                  <stat.Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-green-600 mt-4">{stat.change} from last month</p>
            </div>
          ))}
        </div>

        {/* To do */}
        {todoItems.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">To do</h2>
            <div className="space-y-3">
              {todoItems.map((item) => {
              const Icon = item.Icon;
              const content = (
                <div className="flex items-center gap-4 w-full">
                  <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 text-gray-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                  <span className="flex-shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDismissTodo(item.id);
                      }}
                      className="p-1 hover:text-gray-600 hover:bg-gray-100 transition-colors text-gray-600 border border-gray-300 rounded-full px-2 py-1 inline-flex items-center gap-2 text-xs"
                      aria-label="Dismiss"
                      title="Dismiss" >
                      Dismiss <HiX className="size-3" />                    
                    </button>
                  </span>
                </div>
              );
              const cardClass =
                'bg-white rounded-lg shadow border border-gray-200 p-4 flex items-start gap-4 relative';
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${cardClass} hover:border-primary-200 hover:shadow-md transition-all`}
                >
                  {content}
                </Link>
              ) : (
                <div key={item.id} className={cardClass}>
                  {content}
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* Today's appointments */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today&apos;s appointments</h2>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              {['Total', 'Active', 'Completed', 'Overdue', 'Remaining'].map((label) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                  <div className="mt-2 h-10 bg-gray-100 rounded border border-gray-200" aria-hidden />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 text-center">
              This is where you will get an overview of your appointments for today once they are scheduled.
            </p>
          </div>
        </div>
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
