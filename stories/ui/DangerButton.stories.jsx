import { DangerButton } from '../../components/ui/buttons';

export default {
  title: 'UI/Buttons/DangerButton',
  component: DangerButton,
  args: {
    children: 'Danger',
    disabled: false,
    type: 'button',
    className: '',
    href: '',
  },
  argTypes: {
    children: { description: 'Button label/content.', control: 'text' },
    type: {
      description: 'Native button type attribute.',
      options: ['button', 'submit', 'reset'],
      control: { type: 'select' },
    },
    disabled: { description: 'Disables interaction and applies disabled styles.', control: 'boolean' },
    href: { description: 'Optional route path for navigation on click.', control: 'text' },
    className: { description: 'Additional Tailwind/CSS classes.', control: 'text' },
    onClick: { description: 'Click handler when href is not provided.', action: 'clicked' },
  },
};

export const Default = {
  render: (args) => <DangerButton {...args}>{args.children}</DangerButton>,
  parameters: {
    docs: {
      source: {
        code: `<DangerButton
  type="button" // options: button | submit | reset
  disabled={false}
  href=""
  className=""
  onClick={() => {}}
>
  Danger
</DangerButton>`,
      },
    },
  },
};

export const LightTheme = {
  args: {
    children: 'Danger (Light Theme)',
  },
  parameters: {
    themeVariant: 'light',
  },
};

export const DarkTheme = {
  args: {
    children: 'Danger (Dark Theme)',
  },
  parameters: {
    themeVariant: 'dark',
  },
};
