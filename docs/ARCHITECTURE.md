# Architecture Overview

This document explains the separation between client-side and server-side code in the GoManagr project.

## Code Separation Strategy

The project is organized to clearly distinguish between:
- **Client-side code** (runs in the browser)
- **Server-side code** (runs on Node.js)

## Directory Structure

### Shared / client-facing (`/lib`, `/services`, `/utils`)
**Purpose**: Code used in the browser (and sometimes server)

**Locations**: `/lib`, `/services`, `/utils`

**Subdirectories**:
- `lib/` - Auth, Firebase client, Theme, etc.
- `services/` - User and other client-callable services
- `utils/` - Formatters, validators, helpers

**Import aliases**: `@/lib/*`, `@/services/*`, `@/utils/*`

**Can use**:
- ✅ Browser APIs (`window`, `document`, `localStorage`)
- ✅ React hooks and components
- ✅ Client-side libraries
- ✅ `NEXT_PUBLIC_*` environment variables

**Cannot use**:
- ❌ Node.js APIs (`fs`, `path`, `crypto`)
- ❌ Server-only environment variables
- ❌ Database connections (direct)

**Example**:
```javascript
// lib/firebase.js
import { initializeApp } from 'firebase/app';
export const app = initializeApp(config); // Runs in browser
```

---

### Server-Side (`/server`)
**Purpose**: Code that executes on Node.js server

**Location**: `/server`

**Subdirectories**:
- `api/` - Server API handlers
- `services/` - Business logic, database operations
- `utils/` - Server utilities
- `middleware/` - Request middleware

**Import alias**: `@/server/*`

**Can use**:
- ✅ Node.js APIs (`fs`, `path`, `crypto`, `http`)
- ✅ Server-only environment variables
- ✅ Database connections
- ✅ External API calls
- ✅ File system operations

**Cannot use**:
- ❌ Browser APIs (`window`, `document`)
- ❌ Client-side React hooks (useEffect, useState in server context)

**Example**:
```javascript
// server/services/userService.js
import fs from 'fs';
export async function getUserData(id) {
  // Server-side file reading
  const data = fs.readFileSync(`./data/${id}.json`);
  return JSON.parse(data);
}
```

---

### Next.js API Routes (`/pages/api`)
**Purpose**: Next.js API endpoints (server-side)

**Location**: `/pages/api`

**Behavior**: Automatically server-side rendered

**Can import from**:
- ✅ `@/server/*` - Server utilities and services
- ✅ Node.js APIs
- ✅ Server-only environment variables

**Example**:
```javascript
// pages/api/users.js
import { userService } from '@/server/services/userService';

export default async function handler(req, res) {
  const users = await userService.getAll();
  res.json(users);
}
```

---

### Next.js Pages (`/pages`)
**Purpose**: React pages (can use both client and server code)

**Location**: `/pages`

**Behavior**: 
- Can import from `@/lib/*`, `@/services/*`, `@/utils/*` and `@/server/*`
- Client-side code runs in browser
- Server-side code runs during SSR/getServerSideProps

**Example**:
```javascript
// pages/index.js
import { auth } from '@/lib/firebase'; // Client-side
import { getServerData } from '@/server/utils/data'; // Server-side (in getServerSideProps)

export default function Home({ serverData }) {
  // Client-side code
  const [count, setCount] = useState(0);
  return <div>{serverData}</div>;
}

export async function getServerSideProps() {
  // Server-side code
  const serverData = await getServerData();
  return { props: { serverData } };
}
```

---

## Import Aliases

Configured in `jsconfig.json`:

- `@/lib/*` → `lib/*`
- `@/services/*` → `services/*`
- `@/utils/*` → `utils/*`
- `@/config/*` → `config/*`
- `@/server/*` → `server/*`
- `@/components/*` → `components/*`
- `@/styles/*` → `styles/*`
- `@/pages/*` → `pages/*`

## Best Practices

1. **Always use the correct directory**:
   - Browser / shared code → `/lib`, `/services`, `/utils`
   - Server code → `/server`
   - API endpoints → `/pages/api`

2. **Check environment**:
   ```javascript
   // In client code
   if (typeof window !== 'undefined') {
     // Browser-only code
   }
   ```

3. **Environment variables**:
   - Client: Use `NEXT_PUBLIC_*` prefix
   - Server: Use regular env vars (no prefix)

4. **Never mix concerns**:
   - Don't import `@/server/*` in client components
   - Don't import `@/server/*` in client-only code; use `@/lib/*`, `@/services/*`, `@/utils/*` where appropriate

## Quick Reference

| Code Type | Location | Import Alias | Runs In |
|-----------|----------|-------------|---------|
| Shared libs | `/lib` | `@/lib/*` | Browser / shared |
| Services | `/services` | `@/services/*` | Browser / shared |
| Utils | `/utils` | `@/utils/*` | Browser / shared |
| Server services | `/server/services` | `@/server/services/*` | Node.js |
| Server utils | `/server/utils` | `@/server/utils/*` | Node.js |
| API routes | `/pages/api` | Direct import | Node.js |
| Pages | `/pages` | Direct import | Both |
