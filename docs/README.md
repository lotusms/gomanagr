# GoManagr

A Next.js application with Pages Router, Tailwind CSS, Firebase, SCSS, React, and JavaScript.

## Features

- ✅ **Next.js Pages Router** - Traditional file-based routing
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔥 **Firebase** - Authentication, Firestore, and Storage ready
- 💅 **SCSS** - Enhanced CSS with variables and nesting
- ⚛️ **React** - Latest React version
- 📦 **pnpm** - Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up Firebase:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase project credentials

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
gomanagr/
├── pages/              # Next.js pages (Pages Router)
│   ├── _app.js         # Custom App component
│   ├── index.js        # Home page
│   └── api/            # Next.js API routes (server-side)
│       └── hello.js    # Example API endpoint
├── components/         # Shared React components
├── lib/                # Shared libs (Auth, Firebase, Theme – browser/server as needed)
├── services/           # Services (e.g. userService)
├── utils/              # Shared utilities
├── server/             # Server-side code (runs on Node.js)
│   ├── api/            # Server API handlers
│   ├── services/       # Business logic & services
│   ├── utils/          # Server-side utilities
│   └── middleware/     # Server middleware
├── styles/             # Global styles
│   └── globals.scss    # Global SCSS with Tailwind imports
└── public/             # Static assets
```

### Code Separation

- **Shared / client-facing code**: `lib/`, `services/`, `utils/`
  - Use `@/lib/*`, `@/services/*`, `@/utils/*` import aliases
  - Example: `import { auth } from '@/lib/firebase'`

- **Server Code** (`/server`): Code that runs on Node.js server
  - Use `@/server/*` import alias
  - Can use Node.js APIs, access server-only env vars
  - Example: `import { userService } from '@/server/services/userService'`

- **API Routes** (`/pages/api`): Next.js API endpoints
  - Automatically server-side rendered
  - Can import from `@/server/*`

- **Pages** (`/pages`): Next.js pages (can use both client and server code)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Technologies

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Firebase](https://firebase.google.com/) - Backend services
- [SCSS](https://sass-lang.com/) - CSS preprocessor
- [pnpm](https://pnpm.io/) - Package manager

## License

ISC
# gomanagr
