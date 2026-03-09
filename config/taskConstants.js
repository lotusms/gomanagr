/**
 * Task status and priority constants. Values match DB enum-like CHECK constraints.
 */

export const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'to_do', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Completed' },
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TASK_STATUS_ORDER = ['backlog', 'to_do', 'in_progress', 'blocked', 'done'];

export const LINK_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'project', label: 'Project' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'appointment', label: 'Appointment' },
];
