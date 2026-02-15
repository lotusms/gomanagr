import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/lib/AuthContext';

function ProfileContent() {
  const { currentUser } = useAuth();

  return (
    <>
      <Head>
        <title>Profile - GoManagr</title>
        <meta name="description" content="Your profile" />
      </Head>

      <div className="space-y-6">
        <PageHeader title="Profile" description="Manage your profile information" />

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-sm text-gray-900">{currentUser?.uid}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProfileContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
