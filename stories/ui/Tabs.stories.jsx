import Tabs from '../../components/ui/Tabs';

export default {
  title: 'UI/Tabs',
  component: Tabs,
  args: {
    defaultValue: 'overview',
    variant: 'light',
    items: [
      { value: 'overview', label: 'Overview', content: 'Project overview content.' },
      { value: 'activity', label: 'Activity', content: 'Recent activity content.' },
      { value: 'files', label: 'Files', content: 'Attached files content.' },
    ],
  },
  argTypes: {
    defaultValue: { description: 'Initially selected tab value.', control: 'text' },
    variant: {
      description: 'Visual style variant.',
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
    items: {
      description: 'Tab definitions: value, label, and content.',
      control: 'object',
    },
  },
};

export const Default = {
  render: (args) => (
    <div className="max-w-3xl">
      <Tabs
        items={(args.items || []).map((item) => ({
          ...item,
          content: <p className="text-sm text-gray-700 dark:text-gray-200">{item.content}</p>,
        }))}
        defaultValue={args.defaultValue}
        variant={args.variant}
      />
    </div>
  ),
  parameters: {
    docs: {
      source: {
        code: `<Tabs
  items={[
    { value: 'overview', label: 'Overview', content: <p>Project overview content.</p> },
    { value: 'activity', label: 'Activity', content: <p>Recent activity content.</p> },
    { value: 'files', label: 'Files', content: <p>Attached files content.</p> },
  ]}
  defaultValue="overview"
  variant="light"
/>`,
      },
    },
  },
};

export const Dark = {
  args: {
    variant: 'dark',
  },
};
