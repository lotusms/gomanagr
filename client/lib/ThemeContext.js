import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const [currentPalette, setCurrentPalette] = useState('palette1');
  const [allPalettes, setAllPalettes] = useState({});

  useEffect(() => {
    // Load palettes from client-safe themes module
    import('./themes').then((module) => {
      setAllPalettes(module.palettes);
      
      // Load saved palette from localStorage
      const savedPalette = localStorage.getItem('selectedPalette');
      if (savedPalette && module.palettes[savedPalette]) {
        setCurrentPalette(savedPalette);
        // Apply the saved palette CSS variables
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
      }
    });
  }, []);

  const setPalette = (paletteId) => {
    if (allPalettes[paletteId]) {
      setCurrentPalette(paletteId);
      localStorage.setItem('selectedPalette', paletteId);
      
      // Apply CSS variables for immediate visual feedback
      const palette = allPalettes[paletteId];
      if (palette && palette.colors) {
        const root = document.documentElement;
        // Apply primary, secondary, ternary colors as CSS variables
        Object.keys(palette.colors).forEach((colorType) => {
          const colorScale = palette.colors[colorType];
          Object.keys(colorScale).forEach((shade) => {
            root.style.setProperty(`--color-${colorType}-${shade}`, colorScale[shade]);
          });
        });
      }
      
      // Reload page to apply Tailwind classes (since Tailwind is compiled at build time)
      // This ensures all Tailwind classes use the new palette
      window.location.reload();
    }
  };

  const value = {
    currentPalette,
    setPalette,
    palettes: allPalettes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
