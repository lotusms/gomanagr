import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { HiPlus, HiViewGrid, HiViewList, HiCalendar, HiUser } from 'react-icons/hi';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskList from '@/components/tasks/TaskList';

const VIEWS = [
  { id: 'board', label: 'Board', icon: HiViewGrid },
  { id: 'list', label: 'List', icon: HiViewList },
  { id: 'calendar', label: 'Calendar', icon: HiCalendar },
  { id: 'my', label: 'My Tasks', icon: HiUser },
];

function TasksContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [orgResolved, setOrgResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const taskTermPlural = getTermForIndustry(accountIndustry, 'tasks');
  const taskTermSingular = getTermSingular(taskTermPlural) || 'Task';
  const taskTermSingularLower = (taskTermSingular || 'task').toLowerCase();

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
    setLoading(true);
    const body = {
      userId: currentUser.uid,
      organizationId: orgId,
      myTasks: view === 'my',
    };
    Promise.all([
      fetch('/api/get-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json().then((d) => d.tasks || [])),
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
    ])
      .then(([tasksList, membersList, clientsList]) => {
        setTasks(tasksList);
        setTeamMembers(membersList);
        setClients(clientsList);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, orgId, view]);

  const assigneeNameById = useMemo(() => {
    const map = {};
    (teamMembers || []).forEach((m) => {
      const name = (m.name || m.displayName || m.email || 'Unknown').trim();
      if (m.id) map[m.id] = name;
    });
    return map;
  }, [teamMembers]);

  const clientNameById = useMemo(() => {
    const map = {};
    (clients || []).forEach((c) => {
      const name = (c.name || c.companyName || 'Unnamed').trim();
      if (c.id) map[c.id] = name;
    });
    return map;
  }, [clients]);

  const handleStatusChange = async (task, newStatus) => {
    if (!currentUser?.uid || !orgId) return;
    try {
      const res = await fetch('/api/update-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId: orgId,
          taskId: task.id,
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete || !currentUser?.uid || !orgId) return;
    try {
      const res = await fetch('/api/delete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          organizationId: orgId,
          taskId: taskToDelete.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (e) {
      console.error(e);
      setTaskToDelete(null);
    }
  };

  const handleAddTask = (defaultStatus) => {
    const params = new URLSearchParams();
    if (defaultStatus) params.set('status', defaultStatus);
    router.push(`/dashboard/tasks/new${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const title = taskTermPlural || 'Tasks';

  if (loading) {
    return (
      <>
        <Head>
          <title>{title} - GoManagr</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{title} - GoManagr</title>
        <meta name="description" content={`Manage ${title.toLowerCase()}`} />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={title}
          description={`Board, list, and calendar views for ${taskTermSingularLower}s.`}
          actions={
            <PrimaryButton
              type="button"
              className="gap-2"
              onClick={() => handleAddTask()}
            >
              <HiPlus className="w-5 h-5" />
              Add {taskTermSingularLower}
            </PrimaryButton>
          }
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-600 pb-2">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === v.id
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {v.label}
              </button>
            );
          })}
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            type="custom"
            title={`No ${taskTermSingularLower}s yet`}
            description={`Create your first ${taskTermSingularLower} to get started.`}
            action={
              <PrimaryButton
                type="button"
                className="gap-2"
                onClick={() => handleAddTask()}
              >
                <HiPlus className="w-5 h-5" />
                Create your first {taskTermSingularLower}
              </PrimaryButton>
            }
          />
        ) : (
          <>
            {view === 'board' && (
              <TaskBoard
                tasks={tasks}
                assigneeNameById={assigneeNameById}
                onStatusChange={handleStatusChange}
                onDelete={setTaskToDelete}
                onAddTask={handleAddTask}
              />
            )}
            {view === 'list' && (
              <TaskList
                tasks={tasks}
                assigneeNameById={assigneeNameById}
                clientNameById={clientNameById}
                onDelete={setTaskToDelete}
              />
            )}
            {view === 'calendar' && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400">
                Calendar view: tasks with due dates. (Coming soon.)
              </div>
            )}
            {view === 'my' && (
              <TaskList
                tasks={tasks}
                assigneeNameById={assigneeNameById}
                clientNameById={clientNameById}
                onDelete={setTaskToDelete}
              />
            )}
          </>
        )}

        <ConfirmationDialog
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${taskTermSingularLower}`}
          message={`This ${taskTermSingularLower} will be permanently deleted. This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmationWord="delete"
          variant="danger"
        />
      </div>
    </>
  );
}

export default function TasksPage() {
  return <TasksContent />;
}
