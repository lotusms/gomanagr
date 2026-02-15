import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';

const PLACEHOLDER_CLIENTS = [
  { name: 'Mary Johnson', subtitle: 'Acme Corp' },
  { name: 'David Park', subtitle: 'Tech Solutions Inc' },
  { name: 'Sarah Williams', subtitle: 'Williams & Co' },
  { name: 'James Wilson', subtitle: 'Wilson Consulting' },
  { name: 'Emily Brown', subtitle: 'Brown Designs' },
  { name: 'Michael Davis', subtitle: 'Davis Construction' },
];

function ClientsContent() {
  return (
    <>
      <Head>
        <title>Clients - GoManagr</title>
        <meta name="description" content="Manage your clients" />
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
          <p className="text-gray-600">Manage your client relationships</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PLACEHOLDER_CLIENTS.map((client) => (
            <PersonCard key={client.name} name={client.name} subtitle={client.subtitle} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ClientsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
