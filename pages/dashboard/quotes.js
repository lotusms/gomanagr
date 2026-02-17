import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function QuotesContent() {
  return (
    <>
      <Head>
        <title>Quotes - GoManagr</title>
        <meta name="description" content="Manage quotes" />
      </Head>

      <div className="space-y-6">
        <PageHeader 
          title="Quotes" 
          description="Create and manage quotes for your clients"
          actions={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create quote
            </PrimaryButton>
          }
        />

        <EmptyState
          type="quotes"
          action={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create your first quote
            </PrimaryButton>
          }
        />
      </div>
    </>
  );
}

export default function QuotesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <QuotesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
