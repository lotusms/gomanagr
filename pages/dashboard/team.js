import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';

function TeamContent() {
  return (
    <>
      <Head>
        <title>Team - GoManagr</title>
        <meta name="description" content="Manage your team" />
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team</h1>
          <p className="text-gray-600">Manage your team members</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Team page coming soon...</p>
        </div>
      </div>
    </>
  );
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <TeamContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
