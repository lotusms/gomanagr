import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { HiPlus, HiViewGrid, HiViewList, HiCalendar, HiUser, HiFilter } from 'react-icons/hi';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskList from '@/components/tasks/TaskList';
import TaskCalendar from '@/components/tasks/TaskCalendar';
import Dropdown from '@/components/ui/Dropdown';

const VIEWS = [
  { id: 'board', label: 'Board', icon: HiViewGrid },
  { id: 'list', label: 'List', icon: HiViewList },
  { id: 'calendar', label: 'Calendar', icon: HiCalendar },
  { id: 'my', label: 'My Tasks', icon: HiUser },
];


function FilterDropdown({ id, name, value, onChange, options, placeholder, searchable = false, widthClass = 'w-[160px] min-w-[100px]', className = '' }) {
  return (
    <div className={widthClass}>
      <Dropdown
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        searchable={searchable}
        className={className}
      />
    </div>
  );
}

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
  const [projects, setProjects] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');

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
      assigneeId: filterAssignee || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      dueDateFilter: filterDueDate || undefined,
      clientId: filterClient || undefined,
      projectId: filterProject || undefined,
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
      fetch('/api/get-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => d.projects || [])),
    ])
      .then(([tasksList, membersList, clientsList, projectsList]) => {
        setTasks(tasksList);
        setTeamMembers(membersList);
        setClients(clientsList);
        setProjects(projectsList);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [currentUser?.uid, orgResolved, orgId, view, filterAssignee, filterStatus, filterPriority, filterDueDate, filterClient, filterProject]);

  const assigneeNameById = useMemo(() => {
    const map = {};
    (teamMembers || []).forEach((m) => {
      const name = (m.name || m.displayName || m.email || 'Unknown').trim();
      if (m.id) map[m.id] = name;
      if (m.user_id) map[m.user_id] = name;
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

  const assigneeFilterOptions = [
    { value: '', label: 'All assignees' },
    ...(teamMembers || []).map((m) => ({
      value: m.user_id ?? m.id ?? '',
      label: (m.name || m.displayName || m.email || 'Unknown').trim(),
    })),
  ].filter((o) => o.value != null && o.value !== '');
  const statusFilterOptions = [
    { value: '', label: 'All statuses' },
    ...TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  ];
  const priorityFilterOptions = [
    { value: '', label: 'All priorities' },
    ...TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
  ];
  const dueDateFilterOptions = [
    { value: '', label: 'Any due date' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This week' },
  ];
  const clientFilterOptions = [
    { value: '', label: 'All clients' },
    ...(clients || []).map((c) => ({
      value: c.id,
      label: (c.name || c.companyName || 'Unnamed').trim(),
    })),
  ];
  const projectFilterOptions = [
    { value: '', label: 'All projects' },
    ...(projects || []).map((p) => ({
      value: p.id,
      label: (p.project_name || 'Unnamed').trim(),
    })),
  ];
  const hasActiveFilters = filterAssignee || filterStatus || filterPriority || filterDueDate || filterClient || filterProject;
  const clearFilters = () => {
    setFilterAssignee('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterDueDate('');
    setFilterClient('');
    setFilterProject('');
  };

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

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
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

        <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/50 shadow-sm mb-6">
          <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-gray-200 dark:border-gray-600 mr-1">
            <HiFilter className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 hidden sm:inline">
              Filters
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <FilterDropdown
              id="filter-assignee"
              name="filterAssignee"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              options={assigneeFilterOptions}
              placeholder="Assignee"
              searchable={assigneeFilterOptions.length > 8}
              
            />
            <FilterDropdown
              id="filter-status"
              name="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={statusFilterOptions}
              placeholder="Status"
              
            />
            <FilterDropdown
              id="filter-priority"
              name="filterPriority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={priorityFilterOptions}
              placeholder="Priority"
              
            />
            <FilterDropdown
              id="filter-due"
              name="filterDueDate"
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value)}
              options={dueDateFilterOptions}
              placeholder="Due date"
              
            />
            <FilterDropdown
              id="filter-client"
              name="filterClient"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              options={clientFilterOptions}
              placeholder="Client"
              searchable={clientFilterOptions.length > 10}
              
            />
            <FilterDropdown
              id="filter-project"
              name="filterProject"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              options={projectFilterOptions}
              placeholder="Project"
              searchable={projectFilterOptions.length > 10}
              
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
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
              <TaskCalendar tasks={tasks} assigneeNameById={assigneeNameById} />
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
