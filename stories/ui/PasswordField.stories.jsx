import PasswordField from '../../components/ui/PasswordField';

export default {
  title: 'UI/PasswordField',
  component: PasswordField,
  args: {
    id: 'password',
    label: 'Password',
    value: 'hunter2',
    required: false,
    disabled: false,
    error: '',
    variant: 'light',
  },
  argTypes: {
    id: { description: 'Input element ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Password value.', control: 'text' },
    required: { description: 'Marks field as required.', control: 'boolean' },
    disabled: { description: 'Disables field and toggle button.', control: 'boolean' },
    error: { description: 'Error message shown under field.', control: 'text' },
    variant: {
      description: 'Visual style variant.',
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
    onChange: { description: 'Change handler callback.', action: 'changed' },
  },
};

export const Default = {
  render: (args) => <div className="max-w-md"><PasswordField {...args} /></div>,
  parameters: {
    docs: {
      source: {
        code: `<PasswordField
  id="password"
  label="Password"
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
    value: 'hunter2',
  },
};
