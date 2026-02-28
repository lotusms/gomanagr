import Head from 'next/head';
import { PageHeader, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus, HiDocumentText } from 'react-icons/hi';

function ContractsContent() {
  return (
    <>
      <Head>
        <title>Contracts - GoManagr</title>
        <meta name="description" content="Manage contracts" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Contracts"
          description="Create and manage contracts for your clients"
          actions={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create contract
            </PrimaryButton>
          }
        />

        <EmptyState
          type="custom"
          title="No contracts yet"
          description="Create your first contract to get started."
          icon={HiDocumentText}
          action={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create your first contract
            </PrimaryButton>
          }
        />
      </div>
    </>
  );
}

export default function ContractsPage() {
  return <ContractsContent />;
}
