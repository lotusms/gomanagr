import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function JobsContent() {
  return (
    <>
      <Head>
        <title>Jobs - GoManagr</title>
        <meta name="description" content="Manage jobs" />
      </Head>

      <div className="space-y-6">
        <PageHeader 
          title="Jobs" 
          description="Track and manage your jobs"
          actions={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create job
            </PrimaryButton>
          }
        />

        <EmptyState
          type="jobs"
          action={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create your first job
            </PrimaryButton>
          }
        />
      </div>
    </>
  );
}

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <JobsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
