/**
 * Unit tests for marketing index: exports resolve and are components.
 */
import * as Marketing from '@/components/marketing';

describe('marketing index', () => {
  it('exports SMSCampaignView', () => {
    expect(Marketing.SMSCampaignView).toBeDefined();
    expect(typeof Marketing.SMSCampaignView).toBe('function');
  });

  it('exports EmailCampaignView', () => {
    expect(Marketing.EmailCampaignView).toBeDefined();
    expect(typeof Marketing.EmailCampaignView).toBe('function');
  });

  it('exports RecipientSelector', () => {
    expect(Marketing.RecipientSelector).toBeDefined();
    expect(typeof Marketing.RecipientSelector).toBe('function');
  });

  it('exports CampaignHistoryTable', () => {
    expect(Marketing.CampaignHistoryTable).toBeDefined();
    expect(typeof Marketing.CampaignHistoryTable).toBe('function');
  });
});
