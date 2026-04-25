import { SecondaryButton } from '../../components/ui/buttons';

export default {
  title: 'UI/Buttons/SecondaryButton',
  component: SecondaryButton,
  args: {
    children: 'Secondary',
    disabled: false,
    type: 'button',
    className: '',
    href: '',
    variant: 'default',
    size: 'default',
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
    variant: {
      description: 'Visual color variant for border/text styling.',
      options: ['default', 'light'],
      control: { type: 'radio' },
    },
    size: {
      description: 'Button size preset.',
      options: ['mini', 'small', 'default', 'large'],
      control: { type: 'select' },
    },
    onClick: { description: 'Click handler when href is not provided.', action: 'clicked' },
  },
};

export const Default = {
  render: (args) => <SecondaryButton {...args}>{args.children}</SecondaryButton>,
  parameters: {
    docs: {
      source: {
        code: `<SecondaryButton
  type="button" // options: button | submit | reset
  variant="default" // options: default | light
  size="default" // options: mini | small | default | large
  disabled={false}
  href=""
  className=""
  onClick={() => {}}
>
  Secondary
</SecondaryButton>`,
      },
    },
  },
};

export const LightVariant = {
  args: {
    variant: 'light',
    children: 'Secondary Light',
  },
  parameters: {
    themeVariant: 'light',
  },
};
