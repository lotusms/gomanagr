const { getPaletteForTailwind } = require('./config/themes');

const defaultPalette = getPaletteForTailwind('palette1');

/** Hex to "r g b" so Tailwind opacity modifiers (e.g. primary-500/50) work */
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : '0 0 0';
}
function rgbFallbacks(palette) {
  const out = {};
  ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].forEach((shade) => {
    out[shade] = hexToRgb(palette[shade] || '#000000');
  });
  return out;
}
const p = rgbFallbacks(defaultPalette.primary);
const s = rgbFallbacks(defaultPalette.secondary);
const t = rgbFallbacks(defaultPalette.ternary);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: `rgb(var(--color-primary-50, ${p[50]}) / <alpha-value>)`,
          100: `rgb(var(--color-primary-100, ${p[100]}) / <alpha-value>)`,
          200: `rgb(var(--color-primary-200, ${p[200]}) / <alpha-value>)`,
          300: `rgb(var(--color-primary-300, ${p[300]}) / <alpha-value>)`,
          400: `rgb(var(--color-primary-400, ${p[400]}) / <alpha-value>)`,
          500: `rgb(var(--color-primary-500, ${p[500]}) / <alpha-value>)`,
          600: `rgb(var(--color-primary-600, ${p[600]}) / <alpha-value>)`,
          700: `rgb(var(--color-primary-700, ${p[700]}) / <alpha-value>)`,
          800: `rgb(var(--color-primary-800, ${p[800]}) / <alpha-value>)`,
          900: `rgb(var(--color-primary-900, ${p[900]}) / <alpha-value>)`,
        },
        secondary: {
          50: `rgb(var(--color-secondary-50, ${s[50]}) / <alpha-value>)`,
          100: `rgb(var(--color-secondary-100, ${s[100]}) / <alpha-value>)`,
          200: `rgb(var(--color-secondary-200, ${s[200]}) / <alpha-value>)`,
          300: `rgb(var(--color-secondary-300, ${s[300]}) / <alpha-value>)`,
          400: `rgb(var(--color-secondary-400, ${s[400]}) / <alpha-value>)`,
          500: `rgb(var(--color-secondary-500, ${s[500]}) / <alpha-value>)`,
          600: `rgb(var(--color-secondary-600, ${s[600]}) / <alpha-value>)`,
          700: `rgb(var(--color-secondary-700, ${s[700]}) / <alpha-value>)`,
          800: `rgb(var(--color-secondary-800, ${s[800]}) / <alpha-value>)`,
          900: `rgb(var(--color-secondary-900, ${s[900]}) / <alpha-value>)`,
        },
        ternary: {
          50: `rgb(var(--color-ternary-50, ${t[50]}) / <alpha-value>)`,
          100: `rgb(var(--color-ternary-100, ${t[100]}) / <alpha-value>)`,
          200: `rgb(var(--color-ternary-200, ${t[200]}) / <alpha-value>)`,
          300: `rgb(var(--color-ternary-300, ${t[300]}) / <alpha-value>)`,
          400: `rgb(var(--color-ternary-400, ${t[400]}) / <alpha-value>)`,
          500: `rgb(var(--color-ternary-500, ${t[500]}) / <alpha-value>)`,
          600: `rgb(var(--color-ternary-600, ${t[600]}) / <alpha-value>)`,
          700: `rgb(var(--color-ternary-700, ${t[700]}) / <alpha-value>)`,
          800: `rgb(var(--color-ternary-800, ${t[800]}) / <alpha-value>)`,
          900: `rgb(var(--color-ternary-900, ${t[900]}) / <alpha-value>)`,
        },
      },
      keyframes: {
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'drawer-out': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.95)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        scaleOut: {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.95)' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 0.25s ease-out forwards',
        'drawer-out': 'drawer-out 0.2s ease-in forwards',
      },
    },
  },
  plugins: [],
}
