import Head from 'next/head';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader, ConfirmationDialog, EmptyState } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { isAdminRole } from '@/config/rolePermissions';
import { getDefaultTaskSettings } from '@/lib/taskSettings';
import { HiPlus, HiViewGrid, HiViewList, HiCalendar, HiFilter, HiCog } from 'react-icons/hi';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskList from '@/components/tasks/TaskList';
import TaskCalendar from '@/components/tasks/TaskCalendar';
import TasksViewSkeleton from '@/components/tasks/TasksViewSkeleton';
import TasksSettingsDrawer from '@/components/tasks/TasksSettingsDrawer';
import Dropdown from '@/components/ui/Dropdown';

const VIEW_IDS = [
  { id: 'board', label: 'Board', icon: HiViewGrid },
  { id: 'list', label: 'Table', icon: HiViewList },
  { id: 'calendar', label: 'Calendar', icon: HiCalendar },
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
  const [taskSettings, setTaskSettings] = useState(() => getDefaultTaskSettings());
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

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

  // Load task settings from server (org-wide, same on every device)
  useEffect(() => {
    if (!orgId || !currentUser?.uid) return;
    fetch('/api/get-org-task-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.taskSettings) setTaskSettings(data.taskSettings);
        else setTaskSettings(getDefaultTaskSettings());
      })
      .catch(() => setTaskSettings(getDefaultTaskSettings()));
  }, [orgId, currentUser?.uid]);

  const isTasksAdmin = useMemo(
    () => organization?.membership?.role != null && isAdminRole(organization.membership.role),
    [organization?.membership?.role]
  );

  useEffect(() => {
    if (!currentUser?.uid || !orgResolved || !orgId) return;
    setLoading(true);
    const body = {
      userId: currentUser.uid,
      organizationId: orgId,
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

  const assigneePhotoById = useMemo(() => {
    const map = {};
    (teamMembers || []).forEach((m) => {
      const photo = (m.photoUrl || m.pictureUrl || '').trim();
      if (photo && m.id) map[m.id] = photo;
      if (photo && m.user_id) map[m.user_id] = photo;
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
    ...TASK_STATUSES.map((s) => ({
      value: s.value,
      label: taskSettings?.statusLabels?.[s.value] ?? s.label,
    })),
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
    const previousStatus = task.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
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
    } catch (e) {
      console.error(e);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t))
      );
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

  const title = `${taskTermSingularLower.charAt(0).toUpperCase() + taskTermSingularLower.slice(1)} Management` || 'Task Management';
  const description = `Board, list, and calendar views to help you manage your ${taskTermSingularLower}s.`;

  const visibleViewIds = useMemo(() => {
    // Only admins see filtered views from settings; members always see Board + List + Calendar
    if (!isTasksAdmin) return VIEW_IDS.map((v) => v.id);
    const s = taskSettings;
    if (!s) return VIEW_IDS.map((v) => v.id);
    const ids = ['board'];
    if (s.views?.list !== false) ids.push('list');
    if (s.views?.calendar !== false) ids.push('calendar');
    return ids;
  }, [taskSettings, isTasksAdmin]);

  const viewOptions = useMemo(
    () => VIEW_IDS.filter((v) => visibleViewIds.includes(v.id)).map((v) => ({ ...v, label: v.label })),
    [visibleViewIds]
  );

  useEffect(() => {
    if (!taskSettings || visibleViewIds.includes(view)) return;
    const fallback = visibleViewIds.includes(taskSettings.defaultView) ? taskSettings.defaultView : 'board';
    setView(fallback);
  }, [taskSettings, visibleViewIds, view]);

  const initialDefaultViewSet = useRef(false);
  useEffect(() => {
    if (!taskSettings || initialDefaultViewSet.current) return;
    if (visibleViewIds.includes(taskSettings.defaultView) && taskSettings.defaultView !== 'board') {
      setView(taskSettings.defaultView);
      initialDefaultViewSet.current = true;
    }
  }, [taskSettings, visibleViewIds]);

  if (loading) {
    return (
      <>
        <Head>
          <title>{title} - GoManagr</title>
        </Head>
        <div className="space-y-6">
          <PageHeader
            title={title}
            description={description}
            actions={
              <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            }
          />
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
            {viewOptions.map((v) => {
              const Icon = v.icon;
              const isActive = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-not-allowed ${
                    isActive ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {v.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/50 shadow-sm mb-6">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="flex flex-wrap gap-2 flex-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          </div>
          <TasksViewSkeleton view={view} />
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
          description={description}
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

        {/* Views (board, list, calendar, my) + settings (admin only) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            {viewOptions.map((v) => {
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
          <div className="flex items-center gap-2">
            {isTasksAdmin && (
              <button
                type="button"
                onClick={() => setSettingsDrawerOpen(true)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
                title="Task settings"
                aria-label="Task settings"
              >
                <HiCog className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters bar */}
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

        {/* Tasks views (board, list, calendar, my) - Empty state */}
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
                assigneePhotoById={assigneePhotoById}
                onStatusChange={handleStatusChange}
                onDelete={setTaskToDelete}
                onAddTask={handleAddTask}
                statusLabels={taskSettings?.statusLabels}
              />
            )}
            {view === 'list' && (
              <TaskList
                tasks={tasks}
                assigneeNameById={assigneeNameById}
                assigneePhotoById={assigneePhotoById}
                clientNameById={clientNameById}
                onDelete={setTaskToDelete}
                columnsConfig={taskSettings?.columns}
                statusLabels={taskSettings?.statusLabels}
              />
            )}
            {view === 'calendar' && (
              <TaskCalendar tasks={tasks} assigneeNameById={assigneeNameById} assigneePhotoById={assigneePhotoById} />
            )}
          </>
        )}

        {/* Confirmation dialog for deleting a task */}
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

        {isTasksAdmin && (
          <TasksSettingsDrawer
            isOpen={settingsDrawerOpen}
            onClose={() => setSettingsDrawerOpen(false)}
            orgId={orgId}
            userId={currentUser?.uid}
            taskSettings={taskSettings}
            onSave={(next) => setTaskSettings(next)}
          />
        )}
      </div>
    </>
  );
}

export default function TasksPage() {
  return <TasksContent />;
}
