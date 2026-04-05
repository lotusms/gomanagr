import { clientToMailchimpMember } from '@/lib/marketing/syncOrgClientsToMailchimp';

describe('syncOrgClientsToMailchimp helpers', () => {
  it('clientToMailchimpMember parses name and email', () => {
    expect(
      clientToMailchimpMember({
        email: 'a@b.com',
        firstName: 'Ann',
        lastName: 'Lee',
      })
    ).toEqual({
      email: 'a@b.com',
      firstName: 'Ann',
      lastName: 'Lee',
      name: undefined,
    });
  });

  it('clientToMailchimpMember splits name when first/last missing', () => {
    expect(
      clientToMailchimpMember({
        email: 'x@y.com',
        name: 'Jane Q Public',
      })
    ).toMatchObject({
      email: 'x@y.com',
      firstName: 'Jane',
      lastName: 'Q Public',
    });
  });

  it('clientToMailchimpMember returns null without valid email', () => {
    expect(clientToMailchimpMember({ name: 'No Email' })).toBeNull();
  });
});
