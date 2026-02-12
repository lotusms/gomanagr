# Server Directory

This directory contains **server-side code** that runs only on Node.js (not in the browser).

## Structure

- `api/` - Server API handlers and endpoints
- `services/` - Business logic, database operations, external integrations
- `utils/` - Server-side utility functions
- `middleware/` - Request middleware (auth, validation, logging, etc.)

## Important Notes

⚠️ **Server-only code**: Code in this directory cannot be imported in client-side components or pages that run in the browser.

✅ **Safe to use**:
- Node.js APIs (`fs`, `path`, `crypto`, etc.)
- Server-only environment variables (without `NEXT_PUBLIC_` prefix)
- Database connections
- External API calls

## Usage Examples

### In API Routes (`pages/api/`)
```javascript
import { userService } from '@/server/services/userService';
import { validateRequest } from '@/server/middleware/validation';

export default async function handler(req, res) {
  const user = await userService.getUser(req.query.id);
  res.json(user);
}
```

### In Server Utilities
```javascript
// server/utils/example.js
import fs from 'fs';
import path from 'path';

export function readServerFile(filename) {
  const filePath = path.join(process.cwd(), 'data', filename);
  return fs.readFileSync(filePath, 'utf8');
}
```

## Import Alias

Use `@/server/*` to import from this directory:
```javascript
import { something } from '@/server/utils/helper';
```
