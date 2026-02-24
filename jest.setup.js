require('@testing-library/jest-dom');

const originalError = console.error;
console.error = (...args) => {
  const msg = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
  if (msg.includes('was not wrapped in act') && msg.includes('ForwardRef(LinkComponent)')) {
    return;
  }
  originalError.apply(console, args);
};
