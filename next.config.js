/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: ['./styles'],
  },
  // Disable dev indicators to avoid HMR TypeError in handleStaticIndicator (Next.js/Turbopack internal bug with isrManifest)
  devIndicators: false,
  // Explicitly set Turbopack root to fix pnpm symlink resolution
  experimental: {
    turbo: {
      root: path.resolve(__dirname),
    },
  },
}

module.exports = nextConfig
