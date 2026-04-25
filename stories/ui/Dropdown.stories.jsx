import Dropdown from '../../components/ui/Dropdown';

export default {
  title: 'UI/Dropdown',
  component: Dropdown,
  args: {
    id: 'status',
    label: 'Status',
    value: 'draft',
    placeholder: 'Select status',
    disabled: false,
    searchable: true,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
    ],
  },
  argTypes: {
    id: { description: 'Field ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Selected option value.', control: 'text' },
    placeholder: { description: 'Placeholder when no value selected.', control: 'text' },
    disabled: { description: 'Disables dropdown interaction.', control: 'boolean' },
    searchable: { description: 'Shows search input in dropdown list.', control: 'boolean' },
    options: { description: 'Available options array.', control: 'object' },
    onChange: { description: 'Change handler callback.', action: 'changed' },
  },
};

export const Default = {
  render: (args) => <div className="max-w-md"><Dropdown {...args} /></div>,
  parameters: {
    docs: {
      source: {
        code: `<Dropdown
  id="status"
  label="Status"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  options={[
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
  ]}
  placeholder="Select status"
/>`,
      },
    },
  },
};
