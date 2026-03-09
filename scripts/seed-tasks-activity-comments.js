#!/usr/bin/env node

/**
 * Seed 20 more tasks, 40 comments (spread across all tasks), and 60 activities (all kinds) for the org.
 * Uses same start_date (2026-03-08), same ID nomenclature (LOT-TASK-20260308-NNN), variety of assignees,
 * clients, projects, priorities, statuses, tech titles, descriptions, and checklists.
 *
 * Usage: node scripts/seed-tasks-activity-comments.js [--dry-run]
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const crypto = require('crypto');
const { formatDocumentId, parseDocumentId } = require('../lib/documentIdsServer');

const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const dryRun = process.argv.includes('--dry-run');
if (dryRun) console.log('DRY RUN – no inserts will be made\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_ID = process.env.ORGANIZATION_ID || 'f55b3569-60f7-47a5-a79c-2464f0a28412';
const START_DATE = '2026-03-08';
const ORG_PREFIX = 'LOT';
const TASK_DOC_PREFIX = 'TASK';
const DATE_PART = '20260308';

const TECH_TITLES = [
  'API rate limiting implementation',
  'Database migration to RDS',
  'Kubernetes deployment pipeline',
  'OAuth2 refresh token rotation',
  'GraphQL schema versioning',
  'Redis cache invalidation strategy',
  'CI/CD security scanning',
  'Microservices circuit breaker',
  'Elasticsearch index reindex',
  'WebSocket reconnection logic',
  'Feature flag rollout plan',
  'Monitoring dashboard setup',
  'Backup and restore procedure',
  'Load balancer health checks',
  'Secrets rotation automation',
  'Log aggregation pipeline',
  'Database connection pooling',
  'CDN cache purge on deploy',
  'Audit logging middleware',
  'Multi-region failover test',
];

const DESCRIPTIONS = [
  'Implement and test with staging traffic before production.',
  'Document steps and runbooks for on-call.',
  'Include rollback plan and feature flag.',
  'Coordinate with backend and QA for E2E coverage.',
  'Review security implications and data retention.',
  'Add metrics and alerts before shipping.',
  'Spike: evaluate options and recommend approach.',
  'Refactor for testability and maintainability.',
  'Performance budget: stay under 200ms p99.',
  'Ensure backward compatibility for existing clients.',
  'Follow RFC and get security sign-off.',
  'Automate and add to runbook.',
  'Include load test and chaos scenario.',
  'Document API contract and examples.',
  'Add unit and integration tests.',
  'Consider rate limits and quotas.',
  'Validate with product and design.',
  'Check compliance and data residency.',
  'Optimize for cold start and memory.',
  'Align with platform roadmap.',
];

const STATUSES = ['backlog', 'to_do', 'in_progress', 'blocked', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const ACTIVITY_KINDS = ['status', 'assignee', 'due_at', 'title', 'priority', 'client', 'project'];

const COMMENT_BODIES = [
  'LGTM, merging after CI passes.',
  'Can we add a test for the edge case?',
  'Blocked on design review.',
  'Moving to in progress.',
  'Updated the description with acceptance criteria.',
  'Assigned to me; will pick up this week.',
  'Discussion in Slack – we will use approach B.',
  'Reminder: due date is next Friday.',
  'Added checklist in the description.',
  'Unblocked; continuing implementation.',
  'Need input from backend on the API shape.',
  'Deferred to next sprint.',
  'Done; please verify in staging.',
  'Reopening – found regression in E2E.',
  'Linking related ticket.',
  'Priority bump per product.',
  'Scope reduced; see updated description.',
  'Waiting on infra for test env.',
  'Documented in Confluence.',
  'Ready for QA.',
  'Reassigning to @team.',
  'Extending due date by 2 days.',
  'Client requested this change.',
  'Spike complete; recommendation in comment.',
  'Moved to blocked – dependency on auth team.',
  'Adding more subtasks for tracking.',
  'Duplicate of LOT-TASK-20260308-005.',
  'Consolidating with the other ticket.',
  'No longer needed; closing.',
  'Bumping priority to urgent.',
  'Deploying to prod tonight.',
  'Rollback plan documented.',
  'Monitoring for 24h post-release.',
  'Follow-up task created.',
  'Thanks for the review.',
  'Updated the checklist.',
  'Relevant for the migration work.',
  'Cross-team dependency; syncing Monday.',
  'Approved; proceeding.',
  'Closing – fixed in other PR.',
];

function randomUUID() {
  return crypto.randomUUID();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function addDays(ymd, days) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) + 'T12:00:00.000Z';
}

async function main() {
  console.log('Fetching org data...');
  const [
    { data: orgMembers },
    { data: projects },
    { data: existingTasks },
    { data: orgRow },
  ] = await Promise.all([
    supabase.from('org_members').select('user_id').eq('organization_id', ORG_ID),
    supabase.from('client_projects').select('id, client_id').eq('organization_id', ORG_ID),
    supabase.from('tasks').select('id, task_number').eq('organization_id', ORG_ID),
    supabase.from('organizations').select('id_prefix').eq('id', ORG_ID).single(),
  ]);

  const userIds = (orgMembers || []).map((r) => r.user_id).filter(Boolean);
  if (userIds.length === 0) {
    console.error('No org members found. Aborting.');
    process.exit(1);
  }

  const orgPrefix = (orgRow?.id_prefix || '').trim().toUpperCase().slice(0, 3) || ORG_PREFIX;
  const projectList = projects && projects.length > 0 ? projects : [{ id: '7570689d-f6e5-4432-8c1d-eb0f246ae2ce', client_id: 'CL-20260227-H84DQ4' }];
  const clientIds = [...new Set(projectList.map((p) => p.client_id).filter(Boolean))];
  if (clientIds.length === 0) clientIds.push('CL-20260227-H84DQ4');

  let maxSeq = 0;
  for (const t of existingTasks || []) {
    if (!t.task_number) continue;
    const parsed = parseDocumentId(t.task_number);
    if (parsed && parsed.docPrefix === TASK_DOC_PREFIX && parsed.sequence > maxSeq) maxSeq = parsed.sequence;
  }

  const existingTaskIds = (existingTasks || []).map((t) => t.id);
  const newTaskIds = [];

  const newTasks = [];
  for (let i = 0; i < 20; i++) {
    const seq = maxSeq + 1 + i;
    const taskNumber = formatDocumentId(orgPrefix, TASK_DOC_PREFIX, DATE_PART, seq);
    const id = randomUUID();
    newTaskIds.push(id);
    const duration = [1, 2, 3, 5, 7, 10][Math.floor(Math.random() * 6)];
    const status = pick(STATUSES);
    const priority = pick(PRIORITIES);
    const proj = pick(projectList);
    const dueAt = addDays(START_DATE, duration);
    const numSubtasks = Math.floor(Math.random() * 4) + 1;
    const subtasks = Array.from({ length: numSubtasks }, (_, j) => ({
      id: randomUUID(),
      title: `Step ${j + 1}`,
      completed: Math.random() > 0.6,
    }));
    newTasks.push({
      id,
      organization_id: ORG_ID,
      project_id: proj?.id || null,
      client_id: proj?.client_id || pick(clientIds),
      title: TECH_TITLES[i],
      description: DESCRIPTIONS[i],
      status,
      priority,
      assignee_id: pick(userIds),
      due_at: dueAt,
      start_date: START_DATE,
      duration_days: duration,
      created_by: pick(userIds),
      task_number: taskNumber,
      subtasks,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const allTaskIds = [...existingTaskIds, ...newTaskIds];

  const comments = [];
  for (let i = 0; i < 40; i++) {
    comments.push({
      id: randomUUID(),
      task_id: pick(allTaskIds),
      organization_id: ORG_ID,
      user_id: pick(userIds),
      body: COMMENT_BODIES[i % COMMENT_BODIES.length],
      created_at: new Date(Date.now() - (40 - i) * 3600000).toISOString(),
    });
  }

  const activities = [];
  const kindsUsed = [];
  for (let i = 0; i < 60; i++) {
    const kind = pick(ACTIVITY_KINDS);
    kindsUsed.push(kind);
    let old_value = null;
    let new_value = null;
    if (kind === 'status') {
      const vals = pickN(STATUSES, 2);
      old_value = vals[0];
      new_value = vals[1];
    } else if (kind === 'priority') {
      const vals = pickN(PRIORITIES, 2);
      old_value = vals[0];
      new_value = vals[1];
    } else if (kind === 'assignee') {
      old_value = pick(userIds);
      new_value = pick(userIds);
    } else if (kind === 'due_at') {
      old_value = addDays(START_DATE, 2);
      new_value = addDays(START_DATE, 5);
    } else if (kind === 'title') {
      old_value = 'Old title';
      new_value = pick(TECH_TITLES);
    } else if (kind === 'client') {
      old_value = clientIds[0] || null;
      new_value = clientIds[clientIds.length - 1] || null;
    } else if (kind === 'project') {
      old_value = projectList[0]?.id || null;
      new_value = projectList[projectList.length - 1]?.id || null;
    }
    activities.push({
      id: randomUUID(),
      task_id: pick(allTaskIds),
      organization_id: ORG_ID,
      kind,
      old_value,
      new_value,
      user_id: pick(userIds),
      created_at: new Date(Date.now() - (60 - i) * 1800000).toISOString(),
    });
  }

  if (dryRun) {
    console.log('Would insert', newTasks.length, 'tasks');
    console.log('Would insert', comments.length, 'comments');
    console.log('Would insert', activities.length, 'activities');
    console.log('Sample task:', JSON.stringify(newTasks[0], null, 2));
    return;
  }

  console.log('Inserting', newTasks.length, 'tasks...');
  const { error: tasksErr } = await supabase.from('tasks').insert(newTasks);
  if (tasksErr) {
    console.error('Tasks insert error:', tasksErr);
    process.exit(1);
  }

  console.log('Inserting', comments.length, 'comments...');
  const { error: commentsErr } = await supabase.from('task_comments').insert(comments);
  if (commentsErr) {
    console.error('Comments insert error:', commentsErr);
    process.exit(1);
  }

  console.log('Inserting', activities.length, 'activities...');
  const { error: activitiesErr } = await supabase.from('task_activity').insert(activities);
  if (activitiesErr) {
    console.error('Activity insert error:', activitiesErr);
    process.exit(1);
  }

  console.log('Done. 20 tasks, 40 comments, 60 activities seeded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
