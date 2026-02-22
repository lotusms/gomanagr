import Head from 'next/head';
import { PageHeader, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function InvoicesContent() {
  return (
    <>
      <Head>
        <title>Invoices - GoManagr</title>
        <meta name="description" content="Manage invoices" />
      </Head>

      <div className="space-y-6">
        <PageHeader 
          title="Invoices" 
          description="Create and manage invoices for your clients"
          actions={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create invoice
            </PrimaryButton>
          }
        />

        <EmptyState
          type="invoices"
          action={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create your first invoice
            </PrimaryButton>
          }
        />
      </div>
    </>
  );
}

export default function InvoicesPage() {
  return <InvoicesContent />;
}
