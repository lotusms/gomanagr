/**
 * Team member access: which sections (screens) the admin allows all team members to see.
 * Stored in admin's user_profiles.profile.teamMemberSections.
 * When a section is enabled, team members can only affect their own data (e.g. own appointments, own profile).
 */

export const TEAM_MEMBER_SECTION_KEYS = ['schedule', 'clients', 'projects'];

export const TEAM_MEMBER_SECTION_LABELS = {
  schedule: 'Schedule (view and manage their own appointments)',
  clients: 'Clients (view clients; actions only affect their own context where applicable)',
  projects: 'Projects (view projects; actions only affect their own context where applicable)',
};

/**
 * Returns section labels with industry-based terminology (e.g. "Cases" for Healthcare).
 * Use when displaying labels in the UI; section keys and logic stay unchanged.
 */
export function getTeamMemberSectionLabels(industry) {
  const { getTermForIndustry } = require('@/components/clients/clientProfileConstants');
  const projectTerm = getTermForIndustry(industry, 'project');
  return {
    ...TEAM_MEMBER_SECTION_LABELS,
    projects: `${projectTerm} (view ${projectTerm.toLowerCase()}; actions only affect their own context where applicable)`,
  };
}

export const DEFAULT_TEAM_MEMBER_SECTIONS = Object.fromEntries(
  TEAM_MEMBER_SECTION_KEYS.map((key) => [key, false])
);

/** Paths that require a section to be enabled (for members). Dashboard and My Profile are always allowed. */
export const PATH_TO_SECTION = {
  '/dashboard/schedule': 'schedule',
  '/dashboard/clients': 'clients',
  '/dashboard/projects': 'projects',
};
