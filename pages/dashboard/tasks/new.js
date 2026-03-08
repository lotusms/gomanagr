import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import TaskForm from '@/components/tasks/TaskForm';

export default function NewTaskPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  const { status: queryStatus, projectId: queryProjectId, clientId: queryClientId, assigneeId: queryAssigneeId } = router.query;
  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const taskTermSingular = getTermSingular(getTermForIndustry(accountIndustry, 'tasks')) || 'Task';

  useEffect(() => {
    if (!currentUser?.uid) return;
    setOrgResolved(false);
    getUserOrganization(currentUser.uid)
      .then((o) => setOrganization(o || null))
      .catch(() => setOrganization(null))
      .finally(() => setOrgResolved(true));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  const orgId = organization?.id ?? undefined;

  useEffect(() => {
    if (!currentUser?.uid || !orgResolved || !orgId) return;
    Promise.all([
      fetch('/api/get-org-team-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, callerUserId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.teamMembers || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
      fetch('/api/get-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => d.projects || [])),
    ]).then(([members, clientsList, projectsList]) => {
      setTeamMembers(members);
      setClients(clientsList);
      setProjects(projectsList);
    });
  }, [currentUser?.uid, orgResolved, orgId]);

  const handleSuccess = () => {
    router.push('/dashboard/tasks');
  };

  const handleCancel = () => {
    router.push('/dashboard/tasks');
  };

  if (!orgResolved) {
    return (
      <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-700 rounded" />
    );
  }

  if (!orgId) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        No organization. Create or join an organization first.
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>New {taskTermSingular} - GoManagr</title>
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`New ${taskTermSingular}`}
          description="Create a task and optionally link it to a client or project."
        />
        <TaskForm
          userId={currentUser?.uid}
          organizationId={orgId}
          industry={accountIndustry}
          teamMembers={teamMembers}
          clients={clients}
          projects={projects}
          defaultStatus={queryStatus && String(queryStatus).replace(/\s+/g, '_')}
          defaultProjectId={queryProjectId}
          defaultClientId={queryClientId}
          defaultAssigneeId={queryAssigneeId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </>
  );
}
