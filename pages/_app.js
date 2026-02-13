import '../styles/globals.scss';
import { AuthProvider } from '@/client/lib/AuthContext';
import { ThemeProvider } from '@/client/lib/ThemeContext';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Apply saved palette immediately on mount
    const savedPalette = localStorage.getItem('selectedPalette');
    if (savedPalette) {
      import('@/client/lib/themes').then((module) => {
        const palette = module.palettes[savedPalette];
        if (palette && palette.colors) {
          const root = document.documentElement;
          Object.keys(palette.colors).forEach((colorType) => {
            const colorScale = palette.colors[colorType];
            Object.keys(colorScale).forEach((shade) => {
              root.style.setProperty(`--color-${colorType}-${shade}`, colorScale[shade]);
            });
          });
        }
      });
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  );
}
