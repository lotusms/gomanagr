import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/client/lib/AuthContext';
import { getUserAccount, updateUserTheme } from '@/client/services/userService';

const ThemeContext = createContext({});

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentPalette, setCurrentPalette] = useState('palette1');
  const [allPalettes, setAllPalettes] = useState({});

  const defaultPaletteId = 'palette1';

  // Load palettes and set theme: default for anonymous, from user account when logged in (no localStorage)
  useEffect(() => {
    let cancelled = false;

    import('./themes').then((module) => {
      const palettes = module.palettes;
      if (cancelled) return;
      setAllPalettes(palettes);

      const applyDefault = () => {
        setCurrentPalette(defaultPaletteId);
        applyPaletteColors(defaultPaletteId, palettes);
      };

      if (currentUser) {
        getUserAccount(currentUser.uid)
          .then((account) => {
            if (cancelled) return;
            const fromAccount = account?.selectedPalette;
            if (fromAccount && palettes[fromAccount]) {
              setCurrentPalette(fromAccount);
              applyPaletteColors(fromAccount, palettes);
            } else {
              applyDefault();
            }
          })
          .catch(() => {
            if (!cancelled) applyDefault();
          });
      } else {
        applyDefault();
      }
    });

    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : '0 0 0';
  };

  const applyPaletteColors = (paletteId, palettes) => {
    if (!palettes || !palettes[paletteId]) return;
    
    const palette = palettes[paletteId];
    if (!palette || !palette.colors) return;

    const root = document.documentElement;
    // Set CSS variables as space-separated RGB so Tailwind opacity modifiers (e.g. primary-500/20) work
    Object.keys(palette.colors).forEach((colorType) => {
      const colorScale = palette.colors[colorType];
      Object.keys(colorScale).forEach((shade) => {
        const value = colorScale[shade];
        root.style.setProperty(`--color-${colorType}-${shade}`, typeof value === 'string' && value.startsWith('#') ? hexToRgb(value) : value);
      });
    });
    
    root.setAttribute('data-palette', paletteId);
  };

  const setPalette = (paletteId) => {
    if (!allPalettes || !allPalettes[paletteId]) {
      console.error('Palette not found:', paletteId, 'Available:', Object.keys(allPalettes || {}));
      return;
    }

    setCurrentPalette(paletteId);
    applyPaletteColors(paletteId, allPalettes);

    if (currentUser) {
      updateUserTheme(currentUser.uid, paletteId).catch((e) => {
        console.error('Failed to save theme to account:', e);
      });
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
