import Head from 'next/head';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { HiUserGroup } from 'react-icons/hi';

/** Display name for greeting: only use first/last/full name from profile, never email. */
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

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  const welcomeName = getWelcomeName(userAccount);
  const orgName = organization?.name || 'your team';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Head>
          <title>Team Member - GoManagr</title>
        </Head>
        <div className="max-w-2xl">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <HiUserGroup className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Welcome{welcomeName ? `, ${welcomeName}` : ''}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You’re signed in as a team member of {orgName}.
                </p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              You only have access to this Team Member area for now. Your admin may grant access to more sections as needed.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
