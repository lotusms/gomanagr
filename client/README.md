# Client Directory

This directory contains **client-side code** that runs in the browser.

## Structure

- `lib/` - Client libraries (Firebase SDK, third-party client libraries)
- `utils/` - Client-side utility functions (formatters, validators, browser helpers)
- `components/` - Client-specific React components

## Important Notes

✅ **Client-safe code**: Code in this directory can be imported in:
- React components
- Next.js pages
- Client-side hooks and utilities

⚠️ **Browser APIs only**: Use browser APIs (`window`, `document`, `localStorage`, etc.)
- Check `typeof window !== 'undefined'` before using browser APIs
- Cannot use Node.js APIs (`fs`, `path`, etc.)

## Usage Examples

### In React Components
```javascript
import { auth } from '@/client/lib/firebase';
import { formatDate } from '@/client/utils/formatters';

export default function MyComponent() {
  const handleClick = () => {
    // Client-side code
    if (typeof window !== 'undefined') {
      localStorage.setItem('key', 'value');
    }
  };
  
  return <div>Client component</div>;
}
```

### In Pages
```javascript
import { useState } from 'react';
import { auth } from '@/client/lib/firebase';

export default function HomePage() {
  // Client-side code runs here
  return <div>Home</div>;
}
```

## Import Alias

Use `@/client/*` to import from this directory:
```javascript
import { auth } from '@/client/lib/firebase';
import { formatDate } from '@/client/utils/formatters';
```
