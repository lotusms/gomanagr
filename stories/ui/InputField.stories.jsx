import InputField from '../../components/ui/InputField';

export default {
  title: 'UI/InputField',
  component: InputField,
  args: {
    id: 'name',
    label: 'Name',
    value: 'Jane Doe',
    placeholder: 'Jane Doe',
    required: false,
    disabled: false,
    error: '',
    variant: 'light',
  },
  argTypes: {
    id: { description: 'Input element ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Current input value.', control: 'text' },
    placeholder: { description: 'Placeholder text.', control: 'text' },
    required: { description: 'Marks field as required.', control: 'boolean' },
    disabled: { description: 'Disables the input.', control: 'boolean' },
    error: { description: 'Error message shown below the field.', control: 'text' },
    variant: {
      description: 'Visual style variant.',
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
    onChange: { description: 'Change handler callback.', action: 'changed' },
    onBlur: { description: 'Blur handler callback.', action: 'blurred' },
  },
};

export const Default = {
  render: (args) => <div className="max-w-md"><InputField {...args} /></div>,
  parameters: {
    docs: {
      source: {
        code: `<InputField
  id="name"
  label="Name"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onBlur={() => {}}
  placeholder="Jane Doe"
  required={false}
  disabled={false}
  error=""
  variant="light" // options: light | dark
/>`,
      },
    },
  },
};

export const Dark = {
  args: {
    variant: 'dark',
    value: 'Jane Doe',
    placeholder: 'Jane Doe',
  },
};
