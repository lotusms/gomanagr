import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';

const PLACEHOLDER_TEAM = [
  { name: 'Alex Smith', role: 'Project Manager' },
  { name: 'Jordan Lee', role: 'Developer' },
  { name: 'Casey Morgan', role: 'Designer' },
  { name: 'Riley Chen', role: 'Developer' },
  { name: 'Sam Rivera', role: 'Operations' },
  { name: 'Taylor Wright', role: 'Marketing' },
];

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PLACEHOLDER_TEAM.map((member) => (
            <PersonCard key={member.name} name={member.name} subtitle={member.role} />
          ))}
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
