import { HiClipboardList, HiUsers, HiUserGroup, HiFolder, HiInbox, HiBriefcase, HiDocumentText, HiCalendar, HiTag } from 'react-icons/hi';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

/**
 * EmptyState Component - Reusable empty state display
 * 
 * @param {Object} props
 * @param {string} props.type - Type of empty state: 'services', 'clients', 'team', 'projects', 'requests', 'proposals', 'jobs', 'invoices', 'appointments', or 'custom'
 * @param {string} [props.industry] - Organization industry (for type 'projects': shows e.g. "Cases" for Healthcare)
 * @param {string} props.title - Custom title (optional, uses default based on type)
 * @param {string} props.description - Custom description (optional, uses default based on type)
 * @param {React.ReactNode} props.action - Optional action button/element to display
 * @param {React.ComponentType} props.icon - Custom icon component (optional, uses default based on type)
 * @param {string} props.className - Additional CSS classes
 */
export default function EmptyState({
  type = 'custom',
  industry,
  title,
  description,
  action,
  icon: CustomIcon,
  className = '',
}) {
  const projectTermPlural = type === 'projects' && industry ? getTermForIndustry(industry, 'project') : null;
  const projectTermSingular = projectTermPlural ? getTermSingular(projectTermPlural) : null;
  const projectTermPluralLower = (projectTermPlural || 'projects').toLowerCase();
  const projectTermSingularLower = (projectTermSingular || 'project').toLowerCase();
  const clientTermPlural = industry ? getTermForIndustry(industry, 'client') : null;
  const clientTermSingular = clientTermPlural ? getTermSingular(clientTermPlural) : null;
  const clientTermPluralLower = (clientTermPlural || 'clients').toLowerCase();
  const clientTermSingularLower = (clientTermSingular || 'client').toLowerCase();
  const teamMemberTerm = industry ? getTermForIndustry(industry, 'teamMember') : 'Team members';
  const teamMemberTermLower = teamMemberTerm.toLowerCase();

  const configs = {
    services: {
      icon: HiTag,
      title: 'No services yet',
      description: `Create your first service to start assigning them to ${teamMemberTermLower} and appointments.`,
    },
    clients: {
      icon: HiUserGroup,
      title: clientTermPlural ? `No ${clientTermPluralLower} yet` : 'No clients yet',
      description: clientTermSingular
        ? `Add your first ${clientTermSingularLower} to start managing relationships and tracking interactions.`
        : 'Add your first client to start managing relationships and tracking interactions.',
    },
    team: {
      icon: HiUsers,
      title: `No ${teamMemberTermLower} yet`,
      description: `Add ${teamMemberTermLower} to start scheduling appointments and assigning services.`,
    },
    projects: {
      icon: HiFolder,
      title: projectTermPlural ? `No ${projectTermPluralLower} yet` : 'No projects yet',
      description: projectTermSingular
        ? `Create your first ${projectTermSingularLower} to start organizing work and tracking progress.`
        : 'Create your first project to start organizing work and tracking progress.',
    },
    requests: {
      icon: HiInbox,
      title: 'No requests yet',
      description: `Requests from ${clientTermPluralLower} and ${teamMemberTermLower} will appear here.`,
    },
    proposals: {
      icon: HiDocumentText,
      title: 'No proposals yet',
      description: `Proposals from ${clientTermPluralLower} and ${teamMemberTermLower} will appear here.`,
    },
    jobs: {
      icon: HiBriefcase,
      title: 'No jobs yet',
      description: 'Jobs will appear here once you create quotes and convert them to jobs.',
    },
    contracts: {
      icon: HiClipboardList,
      title: 'No contracts yet',
      description: clientTermPlural ? `Create and manage contracts for your ${clientTermPluralLower}.` : 'Create and manage contracts for your clients.',
    },
    invoices: {
      icon: HiDocumentText,
      title: 'No invoices yet',
      description: 'Create your first invoice to start getting paid for your work.',
    },
    appointments: {
      icon: HiCalendar,
      title: 'No appointments today',
      description: "You're all caught up! Enjoy your free day.",
    },
    custom: {
      icon: null,
      title: title || 'No items yet',
      description: description || 'Get started by adding your first item.',
    },
  };

  const config = configs[type] || configs.custom;
  const IconComponent = CustomIcon || config.icon;

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="flex flex-col items-center justify-center py-16 px-6">
        {IconComponent && (
          <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mb-6">
            <IconComponent className="w-10 h-10 text-gray-300 dark:text-gray-500" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{displayTitle}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">{displayDescription}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
