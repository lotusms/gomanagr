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
  originalError.apply(console, args);
};
