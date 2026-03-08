import { useState, useEffect, useCallback } from 'react';
import TextareaField from '@/components/ui/TextareaField';
import { PrimaryButton } from '@/components/ui/buttons';
import Avatar from '@/components/ui/Avatar';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/config/taskConstants';
import { HiChat, HiLightningBolt } from 'react-icons/hi';
import { useAuth } from '@/lib/AuthContext';
import { useOptionalUserAccount, getDisplayName } from '@/lib/UserAccountContext';

function formatActivityKind(kind, clientTermSingular = 'Client', projectTermSingular = 'Project') {
  const map = {
    created: 'Created',
    status: 'Status',
    assignee: 'Assignee',
    due_at: 'Due date',
    client: `${clientTermSingular}`,
    project: `${projectTermSingular}`,
    title: 'Title',
    priority: 'Priority',
  };
  return map[kind] || kind;
}

function formatStatusValue(v) {
  const s = (TASK_STATUSES || []).find((x) => x.value === v);
  return s ? s.label : v;
}

function formatPriorityValue(v) {
  const p = (TASK_PRIORITIES || []).find((x) => x.value === v);
  return p ? p.label : v;
}

function formatActivityMessage(row, userNameById, clientTermSingular = 'Client', projectTermSingular = 'Project', taskTermSingular = 'Task') {
  const actor = userNameById[row.user_id] || 'Someone';
  const kind = row.kind;
  const taskLower = taskTermSingular.toLowerCase();
  if (kind === 'created') {
    return `${actor} created this ${taskLower}`;
  }
  if (kind === 'status') {
    return `${actor} changed status from ${formatStatusValue(row.old_value)} to ${formatStatusValue(row.new_value)}`;
  }
  if (kind === 'assignee') {
    const oldName = row.old_value ? (userNameById[row.old_value] || 'someone') : 'Unassigned';
    const newName = row.new_value ? (userNameById[row.new_value] || 'someone') : 'Unassigned';
    return `${actor} reassigned from ${oldName} to ${newName}`;
  }
  if (kind === 'due_at') {
    const oldD = row.old_value ? new Date(row.old_value).toLocaleDateString() : '—';
    const newD = row.new_value ? new Date(row.new_value).toLocaleDateString() : '—';
    return `${actor} changed due date from ${oldD} to ${newD}`;
  }
  if (kind === 'title') {
    return `${actor} renamed the ${taskLower}`;
  }
  if (kind === 'priority') {
    return `${actor} changed priority from ${formatPriorityValue(row.old_value)} to ${formatPriorityValue(row.new_value)}`;
  }
  if (kind === 'client') {
    return `${actor} updated the ${clientTermSingular} of the ${taskLower}`;
  }
  if (kind === 'project') {
    return `${actor} updated the ${projectTermSingular} of the ${taskLower}`;
  }
  return `${actor} updated ${formatActivityKind(kind, clientTermSingular, projectTermSingular).toLowerCase()}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function TaskActivityComments({
  taskId,
  organizationId,
  userId,
  teamMembers = [],
  taskTermSingular = 'Task',
  clientTermSingular = 'Client',
  projectTermSingular = 'Project',
}) {
  const [activity, setActivity] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const { currentUser } = useAuth();
  const userAccount = useOptionalUserAccount();

  const userNameById = {};
  (teamMembers || []).forEach((m) => {
    const id = m.id || m.user_id;
    if (id) userNameById[id] = (m.name || m.displayName || m.email || 'Unknown').trim();
  });
  // Ensure current user is always in the map so their comments/activity show their name
  if (userId && currentUser?.uid === userId) {
    const name = userAccount
      ? (getDisplayName(userAccount, currentUser.email || '').trim() || 'You')
      : (currentUser.email || 'You');
    userNameById[userId] = name;
  }

  const fetchData = useCallback(() => {
    if (!userId || !organizationId || !taskId) return;
    setLoading(true);
    Promise.all([
      fetch('/api/get-task-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId, taskId }),
      }).then((r) => r.json().then((d) => d.activity || [])),
      fetch('/api/get-task-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId, taskId }),
      }).then((r) => r.json().then((d) => d.comments || [])),
    ])
      .then(([act, com]) => {
        setActivity(act);
        setComments(com);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, organizationId, taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body || !userId || !organizationId || !taskId) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/add-task-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId, taskId, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add comment');
      setComments((prev) => [...prev, data.comment]);
      setCommentBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60 h-48" />
        <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60 h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Activity timeline */}
      <section className="rounded-xl border border-gray-200/80 dark:border-gray-600/80 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 flex items-center gap-2">
          <HiLightningBolt className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Activity</h3>
        </div>
        <div className="p-4">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No activity yet</p>
          ) : (
            <div className="relative max-h-64 overflow-y-auto">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-600" aria-hidden />
              <ul className="relative space-y-0">
                {activity.map((row) => {
                  const name = userNameById[row.user_id] || 'Someone';
                  return (
                    <li key={row.id} className="relative flex gap-3 pl-1 pb-4 last:pb-0">
                      <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-semibold text-primary-700 dark:text-primary-300">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">
                          {formatActivityMessage(row, userNameById, clientTermSingular, projectTermSingular, taskTermSingular)}
                        </p>
                        <time
                          className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block"
                          title={formatDate(row.created_at)}
                        >
                          {formatRelativeTime(row.created_at)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Comments */}
      <section className="rounded-xl border border-gray-200/80 dark:border-gray-600/80 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 flex items-center gap-2">
          <HiChat className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Comments</h3>
        </div>
        <div className="p-4">
          <ul className="space-y-4 max-h-52 overflow-y-auto mb-4">
            {comments.length === 0 ? (
              <li className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No comments yet</li>
            ) : (
              comments.map((c) => {
                const name = userNameById[c.user_id] || 'Unknown';
                return (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={name} size="sm" className="flex-shrink-0 mt-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300" />
                    <div className="min-w-0 flex-1">
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2">
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1.5">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{name}</span>
                        <span>·</span>
                        <time title={formatDate(c.created_at)}>{formatRelativeTime(c.created_at)}</time>
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <form onSubmit={handleAddComment} className="flex flex-col gap-3">
            <TextareaField
              id="task-comment-body"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              rows={2}
              className="!mb-0"
            />
            <PrimaryButton
              type="submit"
              disabled={!commentBody.trim() || submittingComment}
              className="!min-w-0 self-end px-4 py-1.5 text-sm"
            >
              {submittingComment ? 'Adding…' : 'Add comment'}
            </PrimaryButton>
          </form>
        </div>
      </section>
    </div>
  );
}
