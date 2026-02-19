import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader, EmptyState } from '@/components/ui';
import ProjectCard from '@/components/dashboard/ProjectCard';
import { PrimaryButton } from '@/components/ui/buttons';

/**
 * Flatten all projects from all clients with client info for display.
 * @param {Array} clients - userAccount.clients
 * @returns {Array} { project, clientId, clientName, variant: 'active'|'completed' }
 */
function flattenProjectsFromClients(clients) {
  if (!Array.isArray(clients) || clients.length === 0) return [];

  const items = [];

  clients.forEach((client) => {
    const clientId = client.id;
    const clientName = client.name || 'Unknown Client';

    const active = client.activeProjects || [];
    active.forEach((project) => {
      items.push({
        project,
        clientId,
        clientName,
        variant: 'active',
      });
    });

    const completed = client.completedProjects || [];
    completed.forEach((project) => {
      items.push({
        project,
        clientId,
        clientName,
        variant: 'completed',
      });
    });
  });

  return items;
}

function ProjectsContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const projectsWithClients = useMemo(() => {
    const clients = userAccount?.clients || [];
    return flattenProjectsFromClients(clients);
  }, [userAccount?.clients]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
      })
      .catch(() => setUserAccount(null))
      .finally(() => setLoaded(true));
  }, [currentUser?.uid]);

  if (!loaded) {
    return (
      <>
        <Head>
          <title>Projects - GoManagr</title>
          <meta name="description" content="Manage your projects" />
        </Head>
        <div className="space-y-6">
          <PageHeader title="Projects" description="Manage and track your projects" />
          <div className="flex justify-center min-h-[200px] items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Projects - GoManagr</title>
        <meta name="description" content="Manage your projects" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="All projects from your clients. Edit projects from the client profile."
        />

        {projectsWithClients.length === 0 ? (
          <EmptyState
            type="projects"
            description="Projects are added from client profiles. Add clients and add projects in their Projects tab."
            action={
              <Link href="/dashboard/clients">
                <PrimaryButton className="gap-2">Go to Clients</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsWithClients.map(({ project, clientId, clientName, variant }, idx) => (
              <ProjectCard
                key={`${clientId}-${variant}-${idx}-${project.id || project.name || idx}`}
                project={project}
                index={idx}
                variant={variant}
                currency={userAccount?.defaultCurrency || 'USD'}
                readOnly
                clientId={clientId}
                clientName={clientName}
              />
            ))}
          </div>
        )}
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
