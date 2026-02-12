# Button Components

Reusable button components for consistent styling across the application.

## Components

### PrimaryButton

A primary action button with amber/yellow styling. Used for main CTAs.

**Props:**
- `children` (required) - Button text/content
- `onClick` (optional) - Click handler function
- `href` (optional) - If provided, navigates to route using Next.js router
- `className` (optional) - Additional CSS classes
- `disabled` (optional) - Disable the button
- `type` (optional) - Button type (default: 'button')
- `...props` - Any other button props

**Example:**
```jsx
import { PrimaryButton } from '@/components/buttons';

<PrimaryButton href="/signup">
  Request a demo
</PrimaryButton>

<PrimaryButton onClick={handleClick}>
  Submit
</PrimaryButton>
```

### SecondaryButton

A secondary action button with outlined styling. Used for alternative actions.

**Props:**
- `children` (required) - Button text/content
- `onClick` (optional) - Click handler function
- `href` (optional) - If provided, navigates to route using Next.js router
- `className` (optional) - Additional CSS classes
- `disabled` (optional) - Disable the button
- `type` (optional) - Button type (default: 'button')
- `variant` (optional) - Color variant: 'white' (default) or 'purple'
- `...props` - Any other button props

**Example:**
```jsx
import { SecondaryButton } from '@/components/buttons';

<SecondaryButton href="/signup">
  Start free trial
</SecondaryButton>

<SecondaryButton variant="purple" onClick={handleCancel}>
  Cancel
</SecondaryButton>
```

## Usage

```jsx
import { PrimaryButton, SecondaryButton } from '@/components/buttons';

// Navigation
<PrimaryButton href="/dashboard">Go to Dashboard</PrimaryButton>

// With onClick handler
<SecondaryButton onClick={handleSubmit}>Submit</SecondaryButton>

// Disabled state
<PrimaryButton disabled>Processing...</PrimaryButton>

// Custom styling
<PrimaryButton className="w-full">Full Width</PrimaryButton>
```

## Styling

- **PrimaryButton**: Amber/yellow background with purple text
- **SecondaryButton**: Outlined style with white or purple border
- Both buttons support hover states and disabled states
- Responsive and accessible
