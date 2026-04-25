import TextareaField from '../../components/ui/TextareaField';

export default {
  title: 'UI/TextareaField',
  component: TextareaField,
  args: {
    id: 'notes',
    label: 'Notes',
    value: 'Some notes here...',
    placeholder: 'Additional details...',
    rows: 4,
    required: false,
    disabled: false,
    error: '',
  },
  argTypes: {
    id: { description: 'Textarea ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Textarea content.', control: 'text' },
    placeholder: { description: 'Placeholder text.', control: 'text' },
    rows: { description: 'Visible row count.', control: 'number' },
    required: { description: 'Marks field as required.', control: 'boolean' },
    disabled: { description: 'Disables the field.', control: 'boolean' },
    error: { description: 'Error message shown below field.', control: 'text' },
    onChange: { description: 'Change handler callback.', action: 'changed' },
  },
};

export const Default = {
  render: (args) => <div className="max-w-md"><TextareaField {...args} /></div>,
  parameters: {
    docs: {
      source: {
        code: `<TextareaField
  id="notes"
  label="Notes"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Additional details..."
/>`,
      },
    },
  },
};
