import Head from 'next/head';
import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { createDismissTodoHandler } from '@/utils/dismissTodoHandler';
import { getUserOrganization } from '@/services/organizationService';
import { isAdminRole } from '@/config/rolePermissions';
import { useState, useEffect } from 'react';
import DashboardTodos from '@/components/dashboard/DashboardTodos';
import TodaysAppointments from '@/components/dashboard/TodaysAppointments';
import Link from 'next/link';
import { HiUserGroup, HiInformationCircle, HiKey, HiPencil } from 'react-icons/hi';

const TEAM_MEMBER_TODO_ITEMS = [
  {
    id: 'team-member-info',
    title: 'Your team member area',
    description: 'You only have access to this area for now. Your admin can grant access to more sections when needed.',
    duration: null,
    Icon: HiInformationCircle,
    href: null,
  },
  {
    id: 'need-more-access',
    title: 'Need access to more features?',
    description: 'Reach out to your organization admin to request access to projects, schedule, or other tools.',
    duration: null,
    Icon: HiKey,
    href: null,
  },
];

function getWelcomeName(account) {
  const first = (account?.firstName ?? account?.first_name ?? '').toString().trim();
  const last = (account?.lastName ?? account?.last_name ?? '').toString().trim();
  const full = (account?.name ?? '').toString().trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (full) return full;
  return '';
}

export default function TeamMemberPage() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [scheduleAccount, setScheduleAccount] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setAccountLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null))
      .finally(() => setAccountLoaded(true));
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    fetch('/api/org-schedule-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((res) => res.json())
      .then((data) => setScheduleAccount(data?.schedule ?? null))
      .catch(() => setScheduleAccount(null));
  }, [currentUser?.uid]);

  const welcomeName = getWelcomeName(userAccount);
  const orgName = organization?.name || 'your team';
  const pictureUrl = (userAccount?.pictureUrl ?? userAccount?.profile?.pictureUrl ?? '').toString().trim();
  const dismissedTodoIds = accountLoaded ? (userAccount?.dismissedTodoIds ?? []) : [];

  const memberRole = organization?.membership?.role;
  const showAllAppointments = isAdminRole(memberRole);

  const { staffForToday, appointmentsForToday, schedulePrefs } = useMemo(() => {
    if (!scheduleAccount) return { staffForToday: [], appointmentsForToday: [], schedulePrefs: null };
    if (showAllAppointments) {
      return {
        staffForToday: scheduleAccount.teamMembers || [],
        appointmentsForToday: scheduleAccount.appointments || [],
        schedulePrefs: scheduleAccount,
      };
    }
    if (!currentUser?.email) return { staffForToday: [], appointmentsForToday: [], schedulePrefs: scheduleAccount };
    const emailNorm = (currentUser.email || '').trim().toLowerCase();
    const me = (scheduleAccount.teamMembers || []).find(
      (m) => (m.email || '').trim().toLowerCase() === emailNorm
    );
    if (!me) return { staffForToday: [], appointmentsForToday: [], schedulePrefs: scheduleAccount };
    const myAppointments = (scheduleAccount.appointments || []).filter(
      (a) => String(a.staffId) === String(me.id)
    );
    return {
      staffForToday: [me],
      appointmentsForToday: myAppointments,
      schedulePrefs: scheduleAccount,
    };
  }, [scheduleAccount, currentUser?.email, showAllAppointments]);

  const handleDismissTodo = createDismissTodoHandler({
    userId: currentUser?.uid,
    dismissedTodoIds,
    onSuccess: (next) => setUserAccount((prev) => (prev ? { ...prev, dismissedTodoIds: next } : null)),
  });

  const todoItems =
    accountLoaded && Array.isArray(dismissedTodoIds)
      ? TEAM_MEMBER_TODO_ITEMS.filter((item) => !dismissedTodoIds.includes(item.id))
      : [];

  return (
    <>
        <Head>
          <title>{welcomeName} - GoManagr</title>
        </Head>
        <div className="space-y-4">
          
          <div className="w-full">
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  {pictureUrl ? (
                    <img
                      src={pictureUrl}
                      alt={welcomeName || 'You'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <HiUserGroup className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Welcome{welcomeName ? `, ${welcomeName}` : ''}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {showAllAppointments
                      ? `You're signed in as an admin of ${orgName}.`
                      : `You're signed in as a team member of ${orgName}.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DashboardTodos items={todoItems} onDismiss={handleDismissTodo} />

          {schedulePrefs && (
            <TodaysAppointments
              businessHoursStart={schedulePrefs.businessHoursStart}
              businessHoursEnd={schedulePrefs.businessHoursEnd}
              timeFormat={schedulePrefs.timeFormat}
              dateFormat={schedulePrefs.dateFormat}
              timezone={schedulePrefs.timezone}
              staff={staffForToday || []}
              appointments={appointmentsForToday || []}
              clients={schedulePrefs.clients || []}
              services={schedulePrefs.services || []}
            />
          )}

        </div>
    </>
  );
}
