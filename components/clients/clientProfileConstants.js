export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
];

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Retail',
  'Manufacturing',
  'Construction',
  'Education',
  'Legal',
  'Consulting',
  'Marketing',
  'Hospitality',
  'Transportation',
  'Energy',
  'Agriculture',
  'Home Services',
  'Automotive',
  'Nonprofit',
  'Government',
  'Entertainment',
  'Media',
  'Telecommunications',
  'Utilities',
  'Beauty & Spa',
  'Food & Drink',
  'Health & Wellness',
  'Travel & Tourism',
  'Other',
];

export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5000+',
];

export const PAYMENT_TERMS = [
  'Net 15',
  'Net 30',
  'Net 60',
  'Net 90',
  'Due on Receipt',
  'Custom',
];

export const PRICING_TIERS = [
  'Standard',
  'Premium',
  'Enterprise',
  'Custom',
];

export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

/**
 * Industry-specific terminology. Each concept has a default label and optional
 * per-industry overrides. Add new concepts (e.g. client, service, proposal) here.
 * Keys must match INDUSTRIES; use same spelling (e.g. "Beauty & Spa").
 */
const TERMS_BY_CONCEPT = {
  project: {
    default: 'Projects',
    'Technology': 'Projects',
    'Healthcare': 'Cases',
    'Finance': 'Accounts',
    'Real Estate': 'Properties',
    'Retail': 'Orders',
    'Manufacturing': 'Jobs',
    'Construction': 'Projects',
    'Education': 'Programs',
    'Legal': 'Cases',
    'Consulting': 'Engagements',
    'Marketing': 'Campaigns',
    'Hospitality': 'Reservations',
    'Transportation': 'Shipments',
    'Energy': 'Assets',
    'Agriculture': 'Fields',
    'Home Services': 'Jobs',
    'Automotive': 'Work Orders',
    'Nonprofit': 'Programs',
    'Government': 'Requests',
    'Entertainment': 'Events',
    'Media': 'Projects',
    'Telecommunications': 'Projects',
    'Utilities': 'Projects',
    'Beauty & Spa': 'Appointments',
    'Food & Drink': 'Orders',
    'Health & Wellness': 'Cases',
    'Travel & Tourism': 'Reservations',
    'Other': 'Projects',
  },
  team: {
    default: 'Team',
    'Beauty & Spa': 'Staff',
    'Hospitality': 'Staff',
    'Food & Drink': 'Staff',
    'Healthcare': 'Staff',
    'Other': 'Team',
  },
  teamMember: {
    default: 'Team Members',
    'Beauty & Spa': 'Staff Members',
    'Hospitality': 'Staff Members',
    'Food & Drink': 'Staff Members',
    'Healthcare': 'Staff Members',
    'Other': 'Team Members',
  },
  // Future: client: { default: 'Clients', ... }, service: { default: 'Services', ... }, proposal: { default: 'Proposals', ... },
};

/**
 * Returns the display term for a concept in the given industry.
 * Use this for nav labels, page titles, empty states, etc. Functionality is unchanged; only the label varies.
 * @param {string} industry - The account/organization industry (e.g. "Legal", "Beauty & Spa")
 * @param {string} concept - One of: 'project' | 'team' | 'teamMember' (extend TERMS_BY_CONCEPT for more)
 * @returns {string} - The term for that concept (e.g. "Team", "Staff", "Cases")
 */
export function getTermForIndustry(industry, concept) {
  const key = typeof industry === 'string' ? industry.trim() : '';
  const config = TERMS_BY_CONCEPT[concept];
  if (!config) return concept === 'team' ? 'Team' : concept === 'teamMember' ? 'Team Members' : 'Projects';
  if (!key) return config.default;
  return config[key] ?? config.default;
}

/**
 * @deprecated Use getTermForIndustry(industry, 'project') instead.
 */
export function getProjectTermForIndustry(industry) {
  return getTermForIndustry(industry, 'project');
}

/**
 * Converts a plural term to its singular form (for any concept: project, team member, etc.).
 * @param {string} pluralTerm - The plural term (e.g., "Projects", "Team Members", "Staff Members")
 * @returns {string} - The singular form (e.g., "Project", "Team Member", "Staff Member")
 */
export function getTermSingular(pluralTerm) {
  if (!pluralTerm) return '';

  const singularMap = {
    'Projects': 'Project',
    'Accounts': 'Account',
    'Properties': 'Property',
    'Orders': 'Order',
    'Jobs': 'Job',
    'Cases': 'Case',
    'Engagements': 'Engagement',
    'Campaigns': 'Campaign',
    'Reservations': 'Reservation',
    'Shipments': 'Shipment',
    'Assets': 'Asset',
    'Fields': 'Field',
    'Work Orders': 'Work Order',
    'Programs': 'Program',
    'Requests': 'Request',
    'Events': 'Event',
    'Appointments': 'Appointment',
    'Team Members': 'Team Member',
    'Staff Members': 'Staff Member',
  };

  return singularMap[pluralTerm] || pluralTerm.replace(/s$/, '');
}

/**
 * @deprecated Use getTermSingular(pluralTerm) instead.
 */
export function getProjectTermSingular(pluralTerm) {
  return getTermSingular(pluralTerm) || 'Project';
}

/**
 * Determines if company details and financial information sections should be shown
 * for client creation based on the account's industry.
 * Some industries (e.g. Healthcare, Education) often work with individuals
 * rather than companies, so these sections are hidden by default.
 * @param {string} industry - The account industry
 * @returns {boolean} - True if company/financial sections should be shown
 */
export function shouldShowCompanyFinancialSections(industry) {
  const key = typeof industry === 'string' ? industry.trim() : '';
  if (!key) return true;

  const hideSectionsFor = ['Healthcare', 'Education'];

  return !hideSectionsFor.includes(key);
}

/**
 * Checks if company details section should be shown based on client settings
 * @param {Object} clientSettings - Client settings object from userAccount
 * @param {string} industry - The account industry
 * @returns {boolean} - True if company details should be shown
 */
export function shouldShowCompanyDetails(clientSettings, industry) {
  if (!clientSettings) {
    return shouldShowCompanyFinancialSections(industry);
  }
  
  if (clientSettings.visibleTabs && Array.isArray(clientSettings.visibleTabs)) {
    return clientSettings.visibleTabs.includes('company');
  }
  
  if (clientSettings.showCompanyDetails !== undefined) {
    return clientSettings.showCompanyDetails;
  }
  
  return shouldShowCompanyFinancialSections(industry);
}
