/**
 * Mock data for Marketing module (replace with API calls later).
 */

/** @type {Array<{ id: string, name: string, email?: string, phone?: string, type: 'client' }>} */
export const MOCK_CLIENTS = [
  { id: 'c1', name: 'Acme Corp', email: 'contact@acme.com', phone: '+15551234001', type: 'client' },
  { id: 'c2', name: 'Beta LLC', email: 'hello@beta.io', phone: '+15551234002', type: 'client' },
  { id: 'c3', name: 'Gamma Inc', email: 'info@gamma.com', phone: '+15551234003', type: 'client' },
  { id: 'c4', name: 'Delta Co', email: 'support@delta.co', phone: '+15551234004', type: 'client' },
  { id: 'c5', name: 'Epsilon Ltd', email: 'team@epsilon.com', phone: '+15551234005', type: 'client' },
];

/** @type {Array<{ id: string, name: string, email?: string, phone?: string, type: 'team' }>} */
export const MOCK_TEAM_MEMBERS = [
  { id: 't1', name: 'Jane Smith', email: 'jane@example.com', phone: '+15559876001', type: 'team' },
  { id: 't2', name: 'John Doe', email: 'john@example.com', phone: '+15559876002', type: 'team' },
  { id: 't3', name: 'Alex Rivera', email: 'alex@example.com', phone: '+15559876003', type: 'team' },
];

/** @type {Array<{ id: string, channel: string, name: string, body: string, recipientGroup: string, audienceMode: string, status: string, audienceSize?: number, createdAt?: string, sentAt?: string }>} */
export const MOCK_SMS_CAMPAIGNS = [
  {
    id: 'sms1',
    channel: 'sms',
    name: 'Holiday promo',
    body: 'Happy holidays! 20% off this week.',
    recipientGroup: 'clients',
    audienceMode: 'all',
    status: 'sent',
    audienceSize: 5,
    createdAt: '2025-03-01T10:00:00Z',
    sentAt: '2025-03-01T10:05:00Z',
  },
  {
    id: 'sms2',
    channel: 'sms',
    name: 'Reminder draft',
    body: 'Friendly reminder: your appointment is tomorrow.',
    recipientGroup: 'clients',
    audienceMode: 'selected',
    selectedRecipientIds: ['c1', 'c2'],
    status: 'draft',
    audienceSize: 2,
    createdAt: '2025-03-10T14:00:00Z',
  },
  {
    id: 'sms3',
    channel: 'sms',
    name: 'Team update',
    body: 'All-hands meeting moved to 3pm.',
    recipientGroup: 'team',
    audienceMode: 'all',
    status: 'sent',
    audienceSize: 3,
    createdAt: '2025-03-05T09:00:00Z',
    sentAt: '2025-03-05T09:02:00Z',
  },
];

/** @type {Array<{ id: string, channel: string, name: string, subject?: string, body: string, recipientGroup: string, audienceMode: string, status: string, audienceSize?: number, createdAt?: string, sentAt?: string }>} */
export const MOCK_EMAIL_CAMPAIGNS = [
  {
    id: 'em1',
    channel: 'email',
    name: 'Monthly newsletter',
    subject: 'March updates from your team',
    body: 'Hi {{first_name}},\n\nHere are the latest updates...',
    recipientGroup: 'clients',
    audienceMode: 'all',
    status: 'sent',
    audienceSize: 5,
    createdAt: '2025-03-01T08:00:00Z',
    sentAt: '2025-03-01T08:15:00Z',
  },
  {
    id: 'em2',
    channel: 'email',
    name: 'Welcome series',
    subject: 'Welcome! Here’s how to get started',
    body: 'Hi {{first_name}},\n\nWelcome to our service...',
    recipientGroup: 'clients',
    audienceMode: 'selected',
    selectedRecipientIds: ['c4'],
    status: 'draft',
    audienceSize: 1,
    createdAt: '2025-03-12T11:00:00Z',
  },
  {
    id: 'em3',
    channel: 'email',
    name: 'Internal digest',
    subject: 'Weekly internal digest',
    body: 'Team,\n\nSummary of this week...',
    recipientGroup: 'team',
    audienceMode: 'all',
    status: 'failed',
    audienceSize: 3,
    createdAt: '2025-03-08T07:00:00Z',
    sentAt: null,
  },
];

export function getMockRecipientsByGroup(recipientGroup) {
  return recipientGroup === 'team' ? [...MOCK_TEAM_MEMBERS] : [...MOCK_CLIENTS];
}

export function getMockCampaignsByChannel(channel) {
  return channel === 'sms' ? [...MOCK_SMS_CAMPAIGNS] : [...MOCK_EMAIL_CAMPAIGNS];
}
