import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { HiArrowLeft } from 'react-icons/hi';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { getCurrentSprintEndDate } from '@/lib/taskSettings';
import TaskDetailTrello from '@/components/tasks/TaskDetailTrello';

export default function EditTaskPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();
  const [task, setTask] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taskSettings, setTaskSettings] = useState(null);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const taskTermPlural = getTermForIndustry(accountIndustry, 'tasks');
  const taskTermPluralLower = (taskTermPlural || 'tasks').toLowerCase();
  const taskTermSingular = getTermSingular(taskTermPlural) || 'Task';
  const taskTermSingularLower = taskTermSingular.toLowerCase();
  const backUrl = '/dashboard/tasks';

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
    if (!currentUser?.uid || !orgResolved || !orgId || !id) return;
    setLoading(true);
    Promise.all([
      fetch('/api/get-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId, taskId: id }),
      }).then((r) => r.json().then((d) => d.task)),
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
      fetch('/api/get-org-task-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.taskSettings || null)),
    ])
      .then(([taskData, members, clientsList, projectsList, settings]) => {
        setTask(taskData);
        setTeamMembers(members);
        setClients(clientsList);
        setProjects(projectsList);
        setTaskSettings(settings);
      })
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, orgId, id]);

  const handleSuccess = () => {
    router.push('/dashboard/tasks');
  };

  const handleCancel = () => {
    router.push('/dashboard/tasks');
  };

  if (loading || !orgResolved) {
    return (
      <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-700 rounded" />
    );
  }

  if (!orgId) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        No organization.
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        {task === null ? `${taskTermSingular} not found.` : 'Loading…'}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {taskTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Edit this ${taskTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${taskTermSingular}`}
          description={`Update the details of this ${taskTermSingularLower}. You can change status, assignee, and client, project, etc.`}
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {taskTermPluralLower}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <TaskDetailTrello
            task={task}
            userId={currentUser?.uid}
            organizationId={orgId}
            industry={accountIndustry}
            teamMembers={teamMembers}
            clients={clients}
            projects={projects}
            defaultSprintEndDate={taskSettings ? getCurrentSprintEndDate(taskSettings.sprintStartDate, taskSettings.sprintWeeks) : null}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </>
  );
}
