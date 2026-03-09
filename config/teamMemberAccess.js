/**
 * Team member access: which sections (screens) the admin allows all team members to see.
 * Stored in admin's user_profiles.profile.teamMemberSections.
 * When a section is enabled, team members can only affect their own data (e.g. own appointments, own profile).
 */

const { getTermForIndustry } = require('@/components/clients/clientProfileConstants');

export const TEAM_MEMBER_SECTION_KEYS = ['schedule', 'clients', 'projects', 'contracts', 'tasks'];

/**
 * Returns the display label for each section key using industry terms from clientProfileConstants.
 * Use for toggle row titles so they match sidebar/nav (e.g. "Agreements" when industry uses that for contracts).
 */
export function getSectionDisplayLabels(industry) {
  return {
    schedule: 'Schedule',
    clients: getTermForIndustry(industry, 'client') || 'Clients',
    projects: getTermForIndustry(industry, 'project') || 'Projects',
    contracts: getTermForIndustry(industry, 'contract') || 'Contracts',
    tasks: getTermForIndustry(industry, 'tasks') || 'Tasks',
  };
}

export function getTeamMemberSectionLabels(industry) {
  const clientTerm = getTermForIndustry(industry, 'client');
  const projectTerm = getTermForIndustry(industry, 'project');
  const contractsTerm = getTermForIndustry(industry, 'contract');
  const tasksTerm = getTermForIndustry(industry, 'tasks') || 'Tasks';
  return {
    schedule: 'Schedule (view and manage their own appointments)',
    clients: `${clientTerm || 'Clients'} (view ${(clientTerm || 'clients').toLowerCase()}; actions only affect their own context where applicable)`,
    projects: `${projectTerm || 'Projects'} (view ${(projectTerm || 'projects').toLowerCase()}; actions only affect their own context where applicable)`,
    contracts: `${contractsTerm || 'Contracts'} (view ${(contractsTerm || 'contracts').toLowerCase()}; actions only affect their own context where applicable)`,
    tasks: `${tasksTerm} (view and manage ${(tasksTerm || 'tasks').toLowerCase()})`,
  };
}

export const DEFAULT_TEAM_MEMBER_SECTIONS = Object.fromEntries(
  TEAM_MEMBER_SECTION_KEYS.map((key) => [key, key === 'tasks']) // tasks enabled by default for members; others off
);

/** Paths that require a section to be enabled (for members). Dashboard and My Profile are always allowed. */
export const PATH_TO_SECTION = {
  '/dashboard/schedule': 'schedule',
  '/dashboard/clients': 'clients',
  '/dashboard/projects': 'projects',
  '/dashboard/contracts': 'contracts',
  '/dashboard/tasks': 'tasks',
};
