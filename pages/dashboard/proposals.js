import Head from 'next/head';
import { PageHeader, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

function ProposalsContent() {
  return (
    <>
      <Head>
        <title>Proposals - GoManagr</title>
        <meta name="description" content="Manage proposals" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Proposals"
          description="Manage proposals from clients and team members"
          actions={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create proposal
            </PrimaryButton>
          }
        />

        <EmptyState
          type="proposals"
          action={
            <PrimaryButton className="gap-2">
              <HiPlus className="w-5 h-5" />
              Create your first proposal
            </PrimaryButton>
          }
        />
      </div>
    </>
  );
}

export default function ProposalsPage() {
  return <ProposalsContent />;
}
