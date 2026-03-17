require('@testing-library/jest-dom');

// jsdom does not provide ResizeObserver (used by Radix Dropdown, etc.)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Avoid Supabase throw when loading components that depend on lib/supabase (e.g. DateField -> UserAccountContext)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}

const originalError = console.error;
console.error = (...args) => {
  const msg = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
  if (msg.includes('was not wrapped in act') && msg.includes('ForwardRef(LinkComponent)')) return;
  if (msg.includes('not configured to support act')) return;
  if (msg.includes('Signup error:') && (msg.includes('Rate limit exceeded') || msg.includes('User already exists') || msg.includes('Network error'))) return;
  // Suppress expected API handler error logs from tests (db/delete/insert/upload/auth failures, SMTP/connection errors)
  const isHandlerError =
    /^\[[\w-]+\]/.test(msg) && (
      msg.includes('db error') ||
      msg.includes('delete failed') ||
      msg.includes('insert failed') ||
      msg.includes('upload failed') ||
      msg.includes('update failed') ||
      msg.includes('duplicate key') ||
      msg.includes('auth error') ||
      msg.includes('User not found') ||
      msg.includes('Update failed:') ||
      msg.includes('connection lost') ||
      msg.includes('SMTP error:') ||
      msg.includes('Connection refused') ||
      msg.includes('delete org_members') ||
      msg.includes('deleteUser ')
    );
  const isKnownGlobalError =
    msg.includes('Supabase Admin not configured') ||
    msg.includes('[API] Error uploading logo:') ||
    msg.includes('[API] Error deleting auth user:') ||
    msg.includes('Error updating firstName/lastName:') ||
    msg.includes('Error creating user profile:') ||
    msg.includes('[stripe-balance]');
  if (isHandlerError || isKnownGlobalError) return;
  originalError.apply(console, args);
};
