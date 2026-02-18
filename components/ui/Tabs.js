import * as Tabs from '@radix-ui/react-tabs';

/**
 * Tabs Component using Radix UI
 * 
 * @param {Object} props
 * @param {Array<{value: string, label: string | React.ReactNode, content: React.ReactNode}>} props.items - Array of tab items (label can be string or React node for custom formatting)
 * @param {string} props.defaultValue - Default selected tab value
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - 'dark' (default) or 'light' for light backgrounds
 */
export default function TabsComponent({
  items = [],
  defaultValue,
  className = '',
  variant = 'light',
}) {
  const isLight = variant === 'light';
  const tabsListClass = isLight
    ? 'flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700'
    : 'flex gap-1 mb-6 border-b border-gray-700';
  
  const tabTriggerClass = `
    relative flex-1 px-4 py-3 text-xs xl:text-sm font-medium transition-all duration-200 ease-out
    border-b-2 border-transparent -mb-px
    text-gray-500 dark:text-gray-400 
    hover:text-gray-700 dark:hover:text-gray-300 
    hover:border-gray-300 dark:hover:border-gray-600
    data-[state=active]:text-primary-600 dark:data-[state=active]:text-primary-400
    data-[state=active]:border-primary-500 dark:data-[state=active]:border-primary-400
    data-[state=active]:font-semibold
    whitespace-normal text-center leading-tight
  `;

  if (!items.length) return null;

  return (
    <Tabs.Root
      defaultValue={defaultValue || items[0]?.value}
      className={className}
    >
      <Tabs.List className={tabsListClass}>
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className={tabTriggerClass}
          >
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      
      <div>
        {items.map((item) => (
          <Tabs.Content
            key={item.value}
            value={item.value}
            className="outline-none"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-in fade-in-50 duration-200">
              {item.content}
            </div>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
