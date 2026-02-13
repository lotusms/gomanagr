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
      
      // Load saved palette from localStorage or data attribute
      const savedPalette = localStorage.getItem('selectedPalette') || 
                          document.documentElement.getAttribute('data-palette') || 
                          'palette1';
      
      if (savedPalette && module.palettes[savedPalette]) {
        setCurrentPalette(savedPalette);
        // Apply the saved palette immediately
        applyPaletteColors(savedPalette, module.palettes);
      } else {
        // Apply default palette
        applyPaletteColors('palette1', module.palettes);
      }
    });
  }, []);

  const applyPaletteColors = (paletteId, palettes) => {
    if (!palettes || !palettes[paletteId]) return;
    
    const palette = palettes[paletteId];
    if (!palette || !palette.colors) return;

    const root = document.documentElement;
    // Apply all color shades as CSS variables
    Object.keys(palette.colors).forEach((colorType) => {
      const colorScale = palette.colors[colorType];
      Object.keys(colorScale).forEach((shade) => {
        root.style.setProperty(`--color-${colorType}-${shade}`, colorScale[shade]);
      });
    });
    
    // Also set data attribute for reference
    root.setAttribute('data-palette', paletteId);
  };

  const setPalette = (paletteId) => {
    if (!allPalettes || !allPalettes[paletteId]) {
      console.error('Palette not found:', paletteId, 'Available:', Object.keys(allPalettes || {}));
      return;
    }

    console.log('Setting palette to:', paletteId);
    console.log('Palette data:', allPalettes[paletteId]);
    
    // Save to localStorage immediately
    try {
      localStorage.setItem('selectedPalette', paletteId);
      console.log('Saved to localStorage:', paletteId);
      
      // Verify it was saved
      const verify = localStorage.getItem('selectedPalette');
      console.log('Verified localStorage:', verify);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    
    // Update state immediately
    setCurrentPalette(paletteId);
    
    // Apply palette colors immediately via CSS variables
    // This will update all Tailwind classes that use CSS variables dynamically
    applyPaletteColors(paletteId, allPalettes);
    
    // No reload needed - CSS variables update Tailwind classes dynamically!
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
