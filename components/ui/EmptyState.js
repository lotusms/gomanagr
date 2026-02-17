import { HiClipboardList, HiUsers, HiUserGroup, HiFolder, HiInbox, HiDocumentSearch, HiBriefcase, HiDocumentText, HiCalendar } from 'react-icons/hi';

/**
 * EmptyState Component - Reusable empty state display
 * 
 * @param {Object} props
 * @param {string} props.type - Type of empty state: 'services', 'clients', 'team', 'projects', 'requests', 'quotes', 'jobs', 'invoices', 'appointments', or 'custom'
 * @param {string} props.title - Custom title (optional, uses default based on type)
 * @param {string} props.description - Custom description (optional, uses default based on type)
 * @param {React.ReactNode} props.action - Optional action button/element to display
 * @param {React.ComponentType} props.icon - Custom icon component (optional, uses default based on type)
 * @param {string} props.className - Additional CSS classes
 */
export default function EmptyState({
  type = 'custom',
  title,
  description,
  action,
  icon: CustomIcon,
  className = '',
}) {
  // Default configurations based on type
  const configs = {
    services: {
      icon: HiClipboardList,
      title: 'No services yet',
      description: 'Create your first service to start assigning them to team members and appointments.',
    },
    clients: {
      icon: HiUserGroup,
      title: 'No clients yet',
      description: 'Add your first client to start managing relationships and tracking interactions.',
    },
    team: {
      icon: HiUsers,
      title: 'No team members yet',
      description: 'Add team members to start scheduling appointments and assigning services.',
    },
    projects: {
      icon: HiFolder,
      title: 'No projects yet',
      description: 'Create your first project to start organizing work and tracking progress.',
    },
    requests: {
      icon: HiInbox,
      title: 'No requests yet',
      description: 'Requests from clients and team members will appear here.',
    },
    quotes: {
      icon: HiDocumentSearch,
      title: 'No quotes yet',
      description: 'Create your first quote to start sending proposals to clients.',
    },
    jobs: {
      icon: HiBriefcase,
      title: 'No jobs yet',
      description: 'Jobs will appear here once you create quotes and convert them to jobs.',
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

  // Use custom title/description if provided, otherwise use config defaults
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
