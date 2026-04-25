import Toggle from '../../components/ui/Toggle';
import { useEffect, useState } from 'react';

export default {
  title: 'UI/Toggle',
  component: Toggle,
  args: {
    id: 'layout',
    label: 'Default layout',
    value: 'cards',
    option1: 'cards',
    option1Label: 'Cards',
    option2: 'table',
    option2Label: 'Table',
    variant: 'light',
    disabled: false,
  },
  argTypes: {
    id: { description: 'Toggle group ID.', control: 'text' },
    label: { description: 'Group label text.', control: 'text' },
    value: {
      description: 'Currently selected option value.',
      options: ['cards', 'table'],
      control: { type: 'radio' },
    },
    option1: { description: 'First option value.', control: 'text' },
    option1Label: { description: 'First option display label.', control: 'text' },
    option2: { description: 'Second option value.', control: 'text' },
    option2Label: { description: 'Second option display label.', control: 'text' },
    variant: {
      description: 'Visual style variant.',
      options: ['light', 'dark'],
      control: { type: 'radio' },
    },
    disabled: { description: 'Disables both toggle options.', control: 'boolean' },
    onValueChange: { description: 'Value change callback.', action: 'changed' },
  },
};

export const Default = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value);

    useEffect(() => {
      setValue(args.value);
    }, [args.value]);

    const handleValueChange = (nextValue) => {
      setValue(nextValue);
      args.onValueChange?.(nextValue);
    };

    return <Toggle {...args} value={value} onValueChange={handleValueChange} />;
  },
  parameters: {
    docs: {
      source: {
        code: `<Toggle
  id="layout"
  label="Default layout"
  value={value}
  onValueChange={setValue}
  option1="cards"
  option1Label="Cards"
  option2="table"
  option2Label="Table"
  variant="light"
/>`,
      },
    },
  },
};

export const Dark = {
  args: {
    variant: 'dark',
    value: 'cards',
  },
};
