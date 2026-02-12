/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: ['./styles'],
  },
  // Explicitly set Turbopack root to fix pnpm symlink resolution
  experimental: {
    turbo: {
      root: path.resolve(__dirname),
    },
  },
}

module.exports = nextConfig
