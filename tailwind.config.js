const { getPaletteForTailwind } = require('./config/themes');

// Get palette from localStorage if available (for client-side)
// Note: This runs at build time, so we default to palette1
// The actual theme switching happens via page reload after localStorage is updated
let selectedPalette = 'palette1';

// Try to read from localStorage if we're in a browser environment
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('selectedPalette');
    if (saved) {
      selectedPalette = saved;
    }
  } catch (e) {
    // localStorage might not be available during build
  }
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: getPaletteForTailwind(selectedPalette),
    },
  },
  plugins: [],
}
