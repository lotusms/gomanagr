const { getPaletteForTailwind } = require('./config/themes');

// Default palette - used as fallback values for CSS variables
// The actual theme is applied dynamically via CSS variables set by ThemeContext
const defaultPalette = getPaletteForTailwind('palette1');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for dynamic theming, with fallback to default colors
        primary: {
          50: `var(--color-primary-50, ${defaultPalette.primary[50]})`,
          100: `var(--color-primary-100, ${defaultPalette.primary[100]})`,
          200: `var(--color-primary-200, ${defaultPalette.primary[200]})`,
          300: `var(--color-primary-300, ${defaultPalette.primary[300]})`,
          400: `var(--color-primary-400, ${defaultPalette.primary[400]})`,
          500: `var(--color-primary-500, ${defaultPalette.primary[500]})`,
          600: `var(--color-primary-600, ${defaultPalette.primary[600]})`,
          700: `var(--color-primary-700, ${defaultPalette.primary[700]})`,
          800: `var(--color-primary-800, ${defaultPalette.primary[800]})`,
          900: `var(--color-primary-900, ${defaultPalette.primary[900]})`,
        },
        secondary: {
          50: `var(--color-secondary-50, ${defaultPalette.secondary[50]})`,
          100: `var(--color-secondary-100, ${defaultPalette.secondary[100]})`,
          200: `var(--color-secondary-200, ${defaultPalette.secondary[200]})`,
          300: `var(--color-secondary-300, ${defaultPalette.secondary[300]})`,
          400: `var(--color-secondary-400, ${defaultPalette.secondary[400]})`,
          500: `var(--color-secondary-500, ${defaultPalette.secondary[500]})`,
          600: `var(--color-secondary-600, ${defaultPalette.secondary[600]})`,
          700: `var(--color-secondary-700, ${defaultPalette.secondary[700]})`,
          800: `var(--color-secondary-800, ${defaultPalette.secondary[800]})`,
          900: `var(--color-secondary-900, ${defaultPalette.secondary[900]})`,
        },
        ternary: {
          50: `var(--color-ternary-50, ${defaultPalette.ternary[50]})`,
          100: `var(--color-ternary-100, ${defaultPalette.ternary[100]})`,
          200: `var(--color-ternary-200, ${defaultPalette.ternary[200]})`,
          300: `var(--color-ternary-300, ${defaultPalette.ternary[300]})`,
          400: `var(--color-ternary-400, ${defaultPalette.ternary[400]})`,
          500: `var(--color-ternary-500, ${defaultPalette.ternary[500]})`,
          600: `var(--color-ternary-600, ${defaultPalette.ternary[600]})`,
          700: `var(--color-ternary-700, ${defaultPalette.ternary[700]})`,
          800: `var(--color-ternary-800, ${defaultPalette.ternary[800]})`,
          900: `var(--color-ternary-900, ${defaultPalette.ternary[900]})`,
        },
      },
    },
  },
  plugins: [],
}
