import Head from 'next/head';
import { PageHeader, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function RequestsContent() {
  return (
    <>
      <Head>
        <title>Requests - GoManagr</title>
        <meta name="description" content="Manage requests" />
      </Head>

      <div className="space-y-6">
        <PageHeader 
          title="Requests" 
          description="Manage requests from clients and team members"
          actions={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create request
            </PrimaryButton>
          }
        />

        <EmptyState
          type="requests"
          action={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create your first request
            </PrimaryButton>
          }
        />
      </div>
    </>
  );
}

export default function RequestsPage() {
  return <RequestsContent />;
}
