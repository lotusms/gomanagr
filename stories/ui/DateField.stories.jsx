import DateField from '../../components/ui/DateField';

export default {
  title: 'UI/DateField',
  component: DateField,
  render: (args) => (
    <div className="max-w-md pb-80 overflow-visible h-96">
      <DateField {...args} />
    </div>
  ),
  args: {
    id: 'date',
    label: 'Date',
    value: '2026-04-25',
    variant: 'light',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    required: false,
    disabled: false,
    error: '',
  },
  argTypes: {
    id: { description: 'Input element ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Date value in YYYY-MM-DD.', control: 'text' },
    required: { description: 'Marks field as required.', control: 'boolean' },
    disabled: { description: 'Disables field and picker.', control: 'boolean' },
    error: { description: 'Error message shown below field.', control: 'text' },
    variant: {
      description: 'Visual style variant.',
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
    dateFormat: {
      description: 'Display format for the selected date.',
      options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      control: { type: 'select' },
    },
    timezone: { description: 'IANA timezone for date calculations.', control: 'text' },
    onChange: { description: 'Change handler callback.', action: 'changed' },
  },
};

export const Default = {
  parameters: {
    docs: {
      source: {
        code: `<DateField
  id="date"
  label="Date"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  variant="light"
  timezone="America/New_York"
  dateFormat="MM/DD/YYYY"
/>`,
      },
    },
  },
};

export const Dark = {
  args: {
    variant: 'dark',
    value: '2026-04-25',
  },
};
