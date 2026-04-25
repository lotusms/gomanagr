import Checkbox from '../../components/ui/Checkbox';
import { useEffect, useState } from 'react';

export default {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: {
    id: 'accept-terms',
    label: 'I accept terms',
    checked: false,
    disabled: false,
  },
  argTypes: {
    id: { description: 'Checkbox ID.', control: 'text' },
    label: { description: 'Label text.', control: 'text' },
    checked: { description: 'Current checked state.', control: 'boolean' },
    disabled: { description: 'Disables checkbox interaction.', control: 'boolean' },
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

    return <Checkbox {...args} checked={checked} onCheckedChange={handleCheckedChange} />;
  },
  parameters: {
    docs: {
      source: {
        code: `<Checkbox
  id="accept-terms"
  checked={checked}
  onCheckedChange={setChecked}
  label="I accept terms"
/>`,
      },
    },
  },
};
