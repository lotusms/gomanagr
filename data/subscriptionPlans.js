/**
 * Subscription Plans Data
 * Defines available subscription plans with pricing and features
 * Yearly pricing includes a 15% discount (2 months free)
 */

export const subscriptionPlans = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    yearlyPrice: 499.80, // 15% discount: $49 * 12 * 0.85
    monthlyPricePerMonth: 49,
    yearlyPricePerMonth: 41.65, // $499.80 / 12
    description: 'Perfect for small teams',
    features: [
      'Up to 3 team members',
      'Unlimited clients',
      'Basic reporting',
      'Email support',
    ],
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 99,
    yearlyPrice: 1009.80, // 15% discount: $99 * 12 * 0.85
    monthlyPricePerMonth: 99,
    yearlyPricePerMonth: 84.15, // $1009.80 / 12
    description: 'For growing businesses',
    features: [
      'Up to 10 team members',
      'Advanced reporting',
      'Automations (basic)',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPrice: 199,
    yearlyPrice: 2029.80, // 15% discount: $199 * 12 * 0.85
    monthlyPricePerMonth: 199,
    yearlyPricePerMonth: 169.15, // $2029.80 / 12
    description: 'For scaling organizations',
    features: [
      'Up to 25 team members',
      'Advanced analytics',
      'Roles/permissions',
      'Integrations framework (webhooks/Zapier-style)',
    ],
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 399, // Starting price, can go up to $699 or custom
    monthlyPriceRange: '399', // Display range
    yearlyPrice: 4069.80, // 15% discount: $399 * 12 * 0.85 (using base price)
    monthlyPricePerMonth: 399,
    yearlyPricePerMonth: 339.15, // $4069.80 / 12
    description: 'For large enterprises',
    features: [
      '50+ team members (or Custom)',
      'SLA, SSO, audit logs',
      'Dedicated support',
      'Done-for-you integrations as a paid add-on or included at higher price',
    ],
    popular: false,
    customPricing: true, // Flag to show "Contact Sales" option
  },
];
