jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/AuthContext', () => ({ useAuth: () => ({}), AuthProvider: ({ children }) => children }));
jest.mock('@/services/userService', () => ({ getUserAccount: () => Promise.resolve(null) }));

const { getDisplayName } = require('@/lib/UserAccountContext');

describe('getDisplayName (user name for Hello, and avatar)', () => {
  const email = 'user@example.com';

  it('returns email when account is null or undefined (default)', () => {
    expect(getDisplayName(null, email)).toBe(email);
    expect(getDisplayName(undefined, email)).toBe(email);
  });

  it('returns email when account has no name and no nameView (default)', () => {
    expect(getDisplayName({}, email)).toBe(email);
    expect(getDisplayName({ firstName: '', lastName: '' }, email)).toBe(email);
  });

  it('uses Full Name when nameView is "full" (default nameView)', () => {
    expect(getDisplayName(
      { firstName: 'Luis', lastName: 'Silva', nameView: 'full' },
      email
    )).toBe('Luis Silva');
    expect(getDisplayName(
      { firstName: 'Luis', lastName: '', nameView: 'full' },
      email
    )).toBe('Luis');
    expect(getDisplayName(
      { firstName: '', lastName: 'Silva', nameView: 'full' },
      email
    )).toBe('Silva');
    expect(getDisplayName(
      { firstName: '', lastName: '', nameView: 'full' },
      email
    )).toBe(email);
  });

  it('uses First name only when nameView is "first"', () => {
    expect(getDisplayName(
      { firstName: 'Luis', lastName: 'Silva', nameView: 'first' },
      email
    )).toBe('Luis');
    expect(getDisplayName(
      { firstName: '', lastName: 'Silva', nameView: 'first' },
      email
    )).toBe(email);
  });

  it('uses F. Last when nameView is "f_last"', () => {
    expect(getDisplayName(
      { firstName: 'Luis', lastName: 'Silva', nameView: 'f_last' },
      email
    )).toBe('L. Silva');
    expect(getDisplayName(
      { firstName: '', lastName: 'Silva', nameView: 'f_last' },
      email
    )).toBe('Silva');
    expect(getDisplayName(
      { firstName: 'Luis', lastName: '', nameView: 'f_last' },
      email
    )).toBe('L. ');
    expect(getDisplayName(
      { firstName: '', lastName: '', nameView: 'f_last' },
      email
    )).toBe(email);
  });

  it('uses Last, First when nameView is "last_first"', () => {
    expect(getDisplayName(
      { firstName: 'Luis', lastName: 'Silva', nameView: 'last_first' },
      email
    )).toBe('Silva, Luis');
    expect(getDisplayName(
      { firstName: 'Luis', lastName: '', nameView: 'last_first' },
      email
    )).toBe('Luis');
    expect(getDisplayName(
      { firstName: '', lastName: 'Silva', nameView: 'last_first' },
      email
    )).toBe('Silva');
  });

  it('uses email when nameView is "email"', () => {
    expect(getDisplayName(
      { firstName: 'Luis', lastName: 'Silva', nameView: 'email' },
      email
    )).toBe(email);
  });

  it('defaults nameView to "full" when not set', () => {
    expect(getDisplayName(
      { firstName: 'Luis', lastName: 'Silva' },
      email
    )).toBe('Luis Silva');
  });
});
