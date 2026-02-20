// Common timezones
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

// Common languages
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

// Common industries
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
  'Other',
];

// Company sizes
export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5000+',
];

// Payment terms
export const PAYMENT_TERMS = [
  'Net 15',
  'Net 30',
  'Net 60',
  'Net 90',
  'Due on Receipt',
  'Custom',
];

// Pricing tiers
export const PRICING_TIERS = [
  'Standard',
  'Premium',
  'Enterprise',
  'Custom',
];

// Currencies
export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

/**
 * Maps industry to the appropriate term for "projects" (plural form)
 * @param {string} industry - The industry name
 * @returns {string} - The appropriate term in plural form (e.g., "Projects", "Cases", "Engagements")
 */
export function getProjectTermForIndustry(industry) {
  if (!industry) return 'Projects';
  
  const industryMap = {
    'Technology': 'Projects',
    'Healthcare': 'Patients',
    'Finance': 'Accounts',
    'Real Estate': 'Properties',
    'Retail': 'Orders',
    'Manufacturing': 'Jobs',
    'Construction': 'Projects',
    'Education': 'Students',
    'Legal': 'Cases',
    'Consulting': 'Engagements',
    'Marketing': 'Campaigns',
    'Hospitality': 'Reservations',
    'Transportation': 'Shipments',
    'Energy': 'Assets',
    'Agriculture': 'Fields',
    'Other': 'Projects',
  };
  
  return industryMap[industry] || 'Projects';
}

/**
 * Converts plural project term to singular form
 * @param {string} pluralTerm - The plural term (e.g., "Projects", "Cases", "Patients")
 * @returns {string} - The singular form (e.g., "Project", "Case", "Patient")
 */
export function getProjectTermSingular(pluralTerm) {
  if (!pluralTerm) return 'Project';
  
  // Handle common plural-to-singular conversions
  const singularMap = {
    'Projects': 'Project',
    'Patients': 'Patient',
    'Accounts': 'Account',
    'Properties': 'Property',
    'Orders': 'Order',
    'Jobs': 'Job',
    'Students': 'Student',
    'Cases': 'Case',
    'Engagements': 'Engagement',
    'Campaigns': 'Campaign',
    'Reservations': 'Reservation',
    'Shipments': 'Shipment',
    'Assets': 'Asset',
    'Fields': 'Field',
  };
  
  return singularMap[pluralTerm] || pluralTerm.replace(/s$/, '');
}

/**
 * Determines if company details and financial information sections should be shown
 * for client creation based on the account's industry.
 * Some industries (like Healthcare, Education) typically work with individuals
 * rather than companies, so these sections may not be needed.
 * @param {string} industry - The account industry
 * @returns {boolean} - True if company/financial sections should be shown
 */
export function shouldShowCompanyFinancialSections(industry) {
  if (!industry) return true; // Default to showing sections
  
  // Industries where company/financial details are typically not needed
  // (work more with individuals than companies)
  const hideSectionsFor = [
    'Healthcare', // Patients are individuals
    'Education',  // Students are individuals
  ];
  
  return !hideSectionsFor.includes(industry);
}

/**
 * Checks if company details section should be shown based on client settings
 * @param {Object} clientSettings - Client settings object from userAccount
 * @param {string} industry - The account industry
 * @returns {boolean} - True if company details should be shown
 */
export function shouldShowCompanyDetails(clientSettings, industry) {
  if (!clientSettings) {
    // No settings, use industry-based default
    return shouldShowCompanyFinancialSections(industry);
  }
  
  // Check if visibleTabs array exists and includes 'company'
  if (clientSettings.visibleTabs && Array.isArray(clientSettings.visibleTabs)) {
    return clientSettings.visibleTabs.includes('company');
  }
  
  // Backward compatibility: check old boolean settings
  if (clientSettings.showCompanyDetails !== undefined) {
    return clientSettings.showCompanyDetails;
  }
  
  // Default to industry-based logic
  return shouldShowCompanyFinancialSections(industry);
}
