import { PrimaryButton } from '../../components/ui/buttons';

export default {
  title: 'UI/Buttons/PrimaryButton',
  component: PrimaryButton,
  args: {
    children: 'Primary',
    disabled: false,
    type: 'button',
    className: '',
    href: '',
  },
  argTypes: {
    children: {
      description: 'Button label/content.',
      control: 'text',
    },
    type: {
      description: 'Native button type attribute.',
      options: ['button', 'submit', 'reset'],
      control: { type: 'select' },
    },
    disabled: {
      description: 'Disables interaction and applies disabled styles.',
      control: 'boolean',
    },
    href: {
      description: 'Optional route path for navigation on click.',
      control: 'text',
    },
    className: {
      description: 'Additional Tailwind/CSS classes.',
      control: 'text',
    },
    onClick: {
      description: 'Click handler when href is not provided.',
      action: 'clicked',
    },
  },
};

export const Primary = {
  render: (args) => <PrimaryButton {...args}>{args.children}</PrimaryButton>,
  parameters: {
    docs: {
      source: {
        code: `<PrimaryButton
  type="button" // options: button | submit | reset
  disabled={false}
  href=""
  className=""
  onClick={() => {}}
>
  Primary
</PrimaryButton>`,
      },
    },
  },
};

export const LightTheme = {
  args: {
    children: 'Primary (Light Theme)',
  },
  parameters: {
    themeVariant: 'light',
  },
};

export const DarkTheme = {
  args: {
    children: 'Primary (Dark Theme)',
  },
  parameters: {
    themeVariant: 'dark',
  },
};
