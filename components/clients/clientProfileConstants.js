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
    'Healthcare': 'Cases',
    'Finance': 'Accounts',
    'Real Estate': 'Properties',
    'Retail': 'Orders',
    'Manufacturing': 'Jobs',
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
    'Government': 'Requests',
    'Entertainment': 'Events',
    'Beauty & Spa': 'Appointments',
    'Food & Drink': 'Orders',
    'Health & Wellness': 'Cases',
    'Travel & Tourism': 'Reservations',
  },
  team: {
    default: 'Team',
    'Beauty & Spa': 'Staff',
    'Hospitality': 'Staff',
    'Food & Drink': 'Staff',
    'Healthcare': 'Staff',
    'Nonprofit': 'Staff',
  },
  teamMember: {
    default: 'Team Members',
    'Beauty & Spa': 'Staff Members',
    'Hospitality': 'Staff Members',
    'Food & Drink': 'Staff Members',
    'Healthcare': 'Staff Members',
    'Nonprofit': 'Staff Members',
  },
  client: {
    default: 'Clients',
    'Healthcare': 'Patients',
    'Retail': 'Customers',
    'Manufacturing': 'Accounts',
    'Education': 'Students',
    'Hospitality': 'Guests',
    'Nonprofit': 'Recipients', 
    'Automotive': 'Customers',
    'Government': 'Constituents',
    'Telecommunications': 'Subscribers',
    'Utilities': 'Subscribers',
    'Food & Drink': 'Customers',
    'Travel & Tourism': 'Guests',
  },
  services: {
    default: 'Services',
    'Healthcare': 'Procedures',
    'Retail': 'Products',
    'Manufacturing': 'Products',
    'Education': 'Programs',
    'Nonprofit': 'Programs',
    'Telecommunications': 'Plans',
    'Utilities': 'Plans',
    'Food & Drink': 'Menu Items',
    'Travel & Tourism': 'Packages',
  },
  proposals: {
    default: 'Proposals',
    'Healthcare': 'Estimates',
    'Finance': 'Estimates',
    'Real Estate': 'Offers',
    'Retail': 'Quotes',
    'Manufacturing': 'Quotes',
    'Legal': 'Retainer Agreements',
    'Transportation': 'Quotes',
    'Agriculture': 'Estimates',
    'Home Services': 'Estimates',
    'Nonprofit': 'Estimates',
    'Automotive': 'Estimates',
    'Government': 'Bids',
    'Telecommunications': 'Quotes',
    'Utilities': 'Quotes',
    'Food & Drink': 'Quotes',
    'Travel & Tourism': 'Quotes',
  },
  invoices: {
    default: 'Invoices',
    'Healthcare': 'Bills',
    'Retail': 'Receipts',
    'Education': 'Tuition Statements',
    'Hospitality': 'Bills',
    'Energy': 'Bills',
    'Automotive': 'Repair Orders',
    'Telecommunications': 'Bills',
    'Utilities': 'Bills',
    'Nonprofit': 'Receipts',
    'Food & Drink': 'Receipts',
    'Beauty & Spa': 'Receipts',
    'Travel & Tourism': 'Receipts',
  },
  contracts: {
    default: 'Contracts',
    'Technology': 'Agreements',
    'Healthcare': 'Consent Forms',
    'Finance': 'Agreements',
    'Real Estate': 'Leases',
    'Retail': 'Agreements',
    'Manufacturing': 'Agreements',
    'Education': 'Agreements',
    'Marketing': 'Agreements',
    'Hospitality': 'Agreements',
    'Transportation': 'Agreements',
    'Home Services': 'Agreements',
    'Automotive': 'Service Agreements',
    'Energy': 'Service Agreements',
    'Agriculture': 'Agreements',
    'Nonprofit': 'Agreements',
    'Entertainment': 'Agreements',
    'Media': 'Agreements',
    'Telecommunications': 'Service Agreements',
    'Utilities': 'Service Agreements',
    'Beauty & Spa': 'Service Agreements',
    'Food & Drink': 'Agreements',
    'Health & Wellness': 'Waivers',
    'Travel & Tourism': 'Booking Agreements',
  },
  project_owner: {
    default: 'Project Owner',
    'Healthcare': 'Approving Physician',
    'Finance': 'Accounting Manager',
    'Real Estate': 'Property Manager',
    'Nonprofit': 'Donation Coordinator',
    'Retail': 'Sales Manager',
    'Manufacturing': 'Account Manager',
    'Construction': 'Site Foreman',
    'Education': 'Signing Officer',
    'Legal': 'Signing Counsel',
    'Hospitality': 'Operations Manager',
    'Transportation': 'Fleet Manager',
    'Energy': 'Energy Manager',
    'Agriculture': 'Agriculture Manager',
    'Home Services': 'Home Services Manager',
    'Automotive': 'Shop Manager',
    'Government': 'Government Liaison',
    'Telecommunications': 'Network Manager',
    'Utilities': 'Utility Manager',
    'Beauty & Spa': 'Spa Manager',
    'Food & Drink': 'Restaurant Manager',
    'Health & Wellness': 'Wellness Coordinator',
    'Travel & Tourism': 'Tourism Coordinator',
  },
};

/**
 * Returns the display term for a concept in the given industry.
 * Use this for nav labels, page titles, empty states, etc. Functionality is unchanged; only the label varies.
 * @param {string} industry - The account/organization industry (e.g. "Legal", "Beauty & Spa")
 * @param {string} concept - One of: 'project' | 'project_owner' | 'team' | 'teamMember' | 'client' | 'services' | 'proposal' | 'invoice' | 'contract' (extend TERMS_BY_CONCEPT for more)
 * @returns {string} - The term for that concept (e.g. "Team", "Staff", "Cases")
 */
export function getTermForIndustry(industry, concept) {
  const key = typeof industry === 'string' ? industry.trim() : '';
  const config = TERMS_BY_CONCEPT[concept]
    ?? (concept === 'proposal' ? TERMS_BY_CONCEPT.proposals : undefined)
    ?? (concept === 'invoice' ? TERMS_BY_CONCEPT.invoices : undefined)
    ?? (concept === 'contract' ? TERMS_BY_CONCEPT.contracts : undefined);
  if (!config) return concept === 'team' ? 'Team' : concept === 'teamMember' ? 'Team Members' : concept === 'client' ? 'Clients' : concept === 'services' ? 'Services' : concept === 'proposal' ? 'Proposals' : concept === 'invoice' ? 'Invoices' : concept === 'contract' ? 'Contracts' : 'Projects';
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
    'Clients': 'Client',
    'Patients': 'Patient',
    'Customers': 'Customer',
    'Students': 'Student',
    'Guests': 'Guest',
    'Constituents': 'Constituent',
    'Subscribers': 'Subscriber',
    'Services': 'Service',
    'Procedures': 'Procedure',
    'Products': 'Product',
    'Plans': 'Plan',
    'Menu Items': 'Menu Item',
    'Packages': 'Package',
    'Proposals': 'Proposal',
    'Estimates': 'Estimate',
    'Offers': 'Offer',
    'Quotes': 'Quote',
    'Retainer Agreements': 'Retainer Agreement',
    'Bids': 'Bid',
    'Donation Estimates': 'Donation Estimate',
    // Invoices
    'Invoices': 'Invoice',
    'Bills': 'Bill',
    'Receipts': 'Receipt',
    'Tuition Statements': 'Tuition Statement',
    'Repair Orders': 'Repair Order',
    'Donation Receipts': 'Donation Receipt',
    // Contracts
    'Contracts': 'Contract',
    'Agreements': 'Agreement',
    'Consent Forms': 'Consent Form',
    'Leases': 'Lease',
    'Service Agreements': 'Service Agreement',
    'Waivers': 'Waiver',
    'Booking Agreements': 'Booking Agreement',
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
