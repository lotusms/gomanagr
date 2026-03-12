/**
 * Unit tests for clientProfileConstants (getTermForIndustry, getTermSingular, shouldShow*, etc.)
 */

import {
  getTermForIndustry,
  getProjectTermForIndustry,
  getTermSingular,
  getProjectTermSingular,
  shouldShowCompanyFinancialSections,
  shouldShowCompanyDetails,
  TIMEZONES,
  LANGUAGES,
  CURRENCIES,
} from '@/components/clients/clientProfileConstants';

describe('clientProfileConstants', () => {
  describe('getTermForIndustry', () => {
    it('returns industry override when concept and industry match', () => {
      expect(getTermForIndustry('Healthcare', 'project')).toBe('Cases');
      expect(getTermForIndustry('Legal', 'client')).toBe('Clients');
      expect(getTermForIndustry('Healthcare', 'client')).toBe('Patients');
      expect(getTermForIndustry('Retail', 'client')).toBe('Customers');
    });

    it('returns config.default when key is empty or industry not in config', () => {
      expect(getTermForIndustry('', 'project')).toBe('Projects');
      expect(getTermForIndustry('  ', 'project')).toBe('Projects');
      expect(getTermForIndustry(null, 'project')).toBe('Projects');
      expect(getTermForIndustry('Technology', 'project')).toBe('Projects');
    });

    it('trims industry string', () => {
      expect(getTermForIndustry('  Healthcare  ', 'project')).toBe('Cases');
    });

    it('falls back to proposal/invoice/contract aliases when concept matches', () => {
      expect(getTermForIndustry('Legal', 'proposal')).toBe('Retainer Agreements');
      expect(getTermForIndustry('Healthcare', 'invoice')).toBe('Bills');
      expect(getTermForIndustry('Real Estate', 'contract')).toBe('Leases');
    });

    it('returns default fallback when concept has no config (unknown concept)', () => {
      expect(getTermForIndustry('Healthcare', 'unknownConcept')).toBe('Projects');
    });

    it('returns correct fallbacks for team, teamMember, client, services, proposal, invoice, contract, tasks', () => {
      expect(getTermForIndustry('X', 'team')).toBe('Team');
      expect(getTermForIndustry('X', 'teamMember')).toBe('Team Members');
      expect(getTermForIndustry('X', 'client')).toBe('Clients');
      expect(getTermForIndustry('X', 'services')).toBe('Services');
      expect(getTermForIndustry('X', 'proposal')).toBe('Proposals');
      expect(getTermForIndustry('X', 'invoice')).toBe('Invoices');
      expect(getTermForIndustry('X', 'contract')).toBe('Contracts');
      expect(getTermForIndustry('X', 'tasks')).toBe('Tasks');
    });
  });

  describe('getProjectTermForIndustry', () => {
    it('returns getTermForIndustry(industry, "project")', () => {
      expect(getProjectTermForIndustry('Healthcare')).toBe('Cases');
      expect(getProjectTermForIndustry('')).toBe('Projects');
    });
  });

  describe('getTermSingular', () => {
    it('returns empty string when pluralTerm is falsy', () => {
      expect(getTermSingular('')).toBe('');
      expect(getTermSingular(null)).toBe('');
      expect(getTermSingular(undefined)).toBe('');
    });

    it('returns singular from map for known plurals', () => {
      expect(getTermSingular('Projects')).toBe('Project');
      expect(getTermSingular('Cases')).toBe('Case');
      expect(getTermSingular('Clients')).toBe('Client');
      expect(getTermSingular('Patients')).toBe('Patient');
      expect(getTermSingular('Invoices')).toBe('Invoice');
      expect(getTermSingular('Team Members')).toBe('Team Member');
      expect(getTermSingular('Staff Members')).toBe('Staff Member');
      expect(getTermSingular('Contracts')).toBe('Contract');
      expect(getTermSingular('Agreements')).toBe('Agreement');
    });

    it('falls back to replacing trailing s when not in map', () => {
      expect(getTermSingular('Widgets')).toBe('Widget');
      expect(getTermSingular('Things')).toBe('Thing');
    });
  });

  describe('getProjectTermSingular', () => {
    it('returns getTermSingular(pluralTerm) or "Project"', () => {
      expect(getProjectTermSingular('Projects')).toBe('Project');
      expect(getProjectTermSingular('Cases')).toBe('Case');
      expect(getProjectTermSingular('')).toBe('Project');
      expect(getProjectTermSingular('Unknown')).toBe('Unknown');
    });
  });

  describe('shouldShowCompanyFinancialSections', () => {
    it('returns true when industry is empty', () => {
      expect(shouldShowCompanyFinancialSections('')).toBe(true);
      expect(shouldShowCompanyFinancialSections(null)).toBe(true);
    });

    it('returns false for Healthcare and Education', () => {
      expect(shouldShowCompanyFinancialSections('Healthcare')).toBe(false);
      expect(shouldShowCompanyFinancialSections('Education')).toBe(false);
      expect(shouldShowCompanyFinancialSections('  Healthcare  ')).toBe(false);
    });

    it('returns true for other industries', () => {
      expect(shouldShowCompanyFinancialSections('Legal')).toBe(true);
      expect(shouldShowCompanyFinancialSections('Technology')).toBe(true);
    });
  });

  describe('shouldShowCompanyDetails', () => {
    it('delegates to shouldShowCompanyFinancialSections when clientSettings is null/undefined', () => {
      expect(shouldShowCompanyDetails(null, 'Healthcare')).toBe(false);
      expect(shouldShowCompanyDetails(undefined, 'Legal')).toBe(true);
    });

    it('returns true when visibleTabs includes "company"', () => {
      expect(shouldShowCompanyDetails({ visibleTabs: ['company', 'financial'] }, 'Healthcare')).toBe(true);
      expect(shouldShowCompanyDetails({ visibleTabs: ['company'] }, 'Healthcare')).toBe(true);
    });

    it('returns false when visibleTabs is array and does not include "company"', () => {
      expect(shouldShowCompanyDetails({ visibleTabs: ['financial', 'projects'] }, 'Legal')).toBe(false);
    });

    it('uses showCompanyDetails when visibleTabs is not array', () => {
      expect(shouldShowCompanyDetails({ showCompanyDetails: true }, 'Healthcare')).toBe(true);
      expect(shouldShowCompanyDetails({ showCompanyDetails: false }, 'Legal')).toBe(false);
    });

    it('falls back to shouldShowCompanyFinancialSections when no visibleTabs or showCompanyDetails', () => {
      expect(shouldShowCompanyDetails({}, 'Healthcare')).toBe(false);
      expect(shouldShowCompanyDetails({}, 'Legal')).toBe(true);
    });
  });

  describe('constants', () => {
    it('exports TIMEZONES, LANGUAGES, CURRENCIES as non-empty arrays', () => {
      expect(Array.isArray(TIMEZONES)).toBe(true);
      expect(TIMEZONES.length).toBeGreaterThan(0);
      expect(Array.isArray(LANGUAGES)).toBe(true);
      expect(Array.isArray(CURRENCIES)).toBe(true);
      expect(CURRENCIES.some((c) => c.value === 'USD')).toBe(true);
    });
  });
});
