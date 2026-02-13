import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/client/lib/AuthContext';

function AccountContent() {
  const { currentUser } = useAuth();

  return (
    <>
      <Head>
        <title>My Account - GoManagr</title>
        <meta name="description" content="Manage your account" />
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Account</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-sm text-gray-900">{currentUser?.uid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AccountContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
