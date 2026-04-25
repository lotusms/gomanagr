import Switch from '../../components/ui/Switch';
import { useEffect, useState } from 'react';

export default {
  title: 'UI/Switch',
  component: Switch,
  args: {
    id: 'public-mode',
    label: 'Enable public mode',
    checked: false,
    disabled: false,
  },
  argTypes: {
    id: { description: 'Switch ID.', control: 'text' },
    label: { description: 'Label text.', control: 'text' },
    checked: { description: 'Current enabled state.', control: 'boolean' },
    disabled: { description: 'Disables switch interaction.', control: 'boolean' },
    onCheckedChange: { description: 'Checked state callback.', action: 'changed' },
  },
};

export const Default = {
  render: function Render(args) {
    const [checked, setChecked] = useState(args.checked);

    useEffect(() => {
      setChecked(args.checked);
    }, [args.checked]);

    const handleCheckedChange = (nextChecked) => {
      setChecked(nextChecked);
      args.onCheckedChange?.(nextChecked);
    };

    return <Switch {...args} checked={checked} onCheckedChange={handleCheckedChange} />;
  },
  parameters: {
    docs: {
      source: {
        code: `<Switch
  id="public-mode"
  checked={checked}
  onCheckedChange={setChecked}
  label="Enable public mode"
/>`,
      },
    },
  },
};
