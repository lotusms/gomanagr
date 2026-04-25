import TimeField from '../../components/ui/TimeField';

export default {
  title: 'UI/TimeField',
  component: TimeField,
  render: (args) => <div className="max-w-md pb-80 overflow-visible h-96"><TimeField {...args} /></div>,
  args: {
    id: 'time',
    label: 'Time',
    value: '09:00',
    variant: 'light',
    timeFormat: '12h',
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
    required: false,
    disabled: false,
    error: '',
  },
  argTypes: {
    id: { description: 'Input element ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Selected time value.', control: 'text' },
    timeFormat: {
      description: 'Displayed time format.',
      options: ['12h', '24h'],
      control: { type: 'radio' },
    },
    businessHoursStart: { description: 'First generated slot (HH:mm).', control: 'text' },
    businessHoursEnd: { description: 'Last generated slot (HH:mm).', control: 'text' },
    required: { description: 'Marks field as required.', control: 'boolean' },
    disabled: { description: 'Disables field and picker.', control: 'boolean' },
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
  parameters: {
    docs: {
      source: {
        code: `<TimeField
  id="time"
  label="Time"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  variant="light"
  timeFormat="12h"
/>`,
      },
    },
  },
};

export const Dark = {
  args: {
    variant: 'dark',
    value: '09:00',
  },
};
