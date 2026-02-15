import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Schedule from '@/components/dashboard/Schedule';
import { PageHeader } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';
import Drawer from '@/components/ui/Drawer';

function ScheduleContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  return (
    <>
      <Head>
        <title>Schedule - GoManagr</title>
        <meta name="description" content="View your schedule" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Schedule"
          description="Manage your Schedule."
          actions={
            <>
              <PrimaryButton type="button" onClick={() => setShowAdd(true)} className="gap-2">
                <HiPlus className="w-5 h-5" />
                Add appointment
              </PrimaryButton>
              {saving && <span className="text-sm text-gray-500">Saving…</span>}
            </>
          }
        />
        <Schedule
          businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
          businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
          timeFormat={userAccount?.timeFormat ?? '24h'}
        />
        <Drawer isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add appointment">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add appointment</h2>
            <p className="text-gray-600 mb-4">Add a new appointment to your schedule.</p>
          </div>
        </Drawer>
      </div>
    </>
  );
}

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ScheduleContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
