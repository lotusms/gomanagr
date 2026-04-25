import NumberField from '../../components/ui/NumberField';

export default {
  title: 'UI/NumberField',
  component: NumberField,
  args: {
    id: 'quantity',
    label: 'Quantity',
    value: 1,
    min: 1,
    max: 99,
    step: 1,
    required: false,
    disabled: false,
    error: '',
    variant: 'light',
  },
  argTypes: {
    id: { description: 'Input element ID.', control: 'text' },
    label: { description: 'Field label text.', control: 'text' },
    value: { description: 'Current numeric value.', control: 'number' },
    min: { description: 'Minimum allowed value.', control: 'number' },
    max: { description: 'Maximum allowed value.', control: 'number' },
    step: { description: 'Increment/decrement step size.', control: 'number' },
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
  render: (args) => <div className="max-w-md"><NumberField {...args} /></div>,
  parameters: {
    docs: {
      source: {
        code: `<NumberField
  id="quantity"
  label="Quantity"
  value={value}
  min={1}
  max={99}
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
    value: 5,
  },
};
