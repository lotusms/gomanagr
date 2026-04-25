import { IconButton } from '../../components/ui/buttons';

export default {
  title: 'UI/Buttons/IconButton',
  component: IconButton,
  args: {
    children: '+',
    variant: 'primary',
    white: false,
    className: '',
    'aria-label': 'Add item',
  },
  argTypes: {
    children: { description: 'Icon/content rendered inside the button.', control: 'text' },
    variant: {
      description: 'Color variant style.',
      options: ['primary', 'secondary', 'danger', 'light'],
      control: { type: 'radio' },
    },
    white: {
      description: "For `light` variant, forces white icon treatment.",
      control: 'boolean',
    },
    className: { description: 'Additional Tailwind/CSS classes.', control: 'text' },
    'aria-label': { description: 'Accessible label for icon-only button use.', control: 'text' },
    onClick: { description: 'Click handler callback.', action: 'clicked' },
  },
};

export const Default = {
  render: (args) => (
    <IconButton
      variant={args.variant}
      white={args.white}
      className={args.className}
      aria-label={args['aria-label']}
      onClick={args.onClick}
    >
      {args.children}
    </IconButton>
  ),
  parameters: {
    docs: {
      source: {
        code: `<IconButton
  variant="primary" // options: primary | secondary | danger | light
  white={false}
  className=""
  aria-label="Add item"
  onClick={() => {}}
>
  +
</IconButton>`,
      },
    },
  },
};

export const LightVariant = {
  args: {
    variant: 'light',
    white: true,
    children: '+',
  },
  parameters: {
    themeVariant: 'light',
  },
};

export const DarkVariant = {
  args: {
    variant: 'light',
    white: false,
    children: '+',
  },
  parameters: {
    themeVariant: 'dark',
  },
};
