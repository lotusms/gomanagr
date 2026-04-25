import DateTimeField from '../../components/ui/DateTimeField';

export default {
  title: 'UI/DateTimeField',
  component: DateTimeField,
  args: {
    id: 'date-time',
    label: 'Date and time',
    value: '2026-04-25T09:30',
    variant: 'light',
    required: false,
    disabled: false,
    error: '',
  },
  argTypes: {
    id: { description: 'Input element ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Datetime-local value.', control: 'text' },
    required: { description: 'Marks field as required.', control: 'boolean' },
    disabled: { description: 'Disables the field.', control: 'boolean' },
    error: { description: 'Error message shown below field.', control: 'text' },
    variant: {
      description: 'Visual style variant.',
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
    onChange: { description: 'Change handler callback.', action: 'changed' },
  },
};

export const Default = {
  render: (args) => <div className="max-w-md"><DateTimeField {...args} /></div>,
  parameters: {
    docs: {
      source: {
        code: `<DateTimeField
  id="date-time"
  label="Date and time"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  variant="light"
/>`,
      },
    },
  },
};

export const Dark = {
  args: {
    variant: 'dark',
    value: '2026-04-25T09:30',
  },
};
