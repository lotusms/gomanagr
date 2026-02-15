import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui';

function ProjectsContent() {
  return (
    <>
      <Head>
        <title>Projects - GoManagr</title>
        <meta name="description" content="Manage your projects" />
      </Head>

      <div className="space-y-6">
        <PageHeader title="Projects" description="Manage and track your projects" />

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Projects page coming soon...</p>
        </div>
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProjectsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
