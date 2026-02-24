import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateUserTheme } from '@/services/userService';

const ThemeContext = createContext({});

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentPalette, setCurrentPalette] = useState('palette1');
  const [allPalettes, setAllPalettes] = useState({});
  const [themeReady, setThemeReady] = useState(false);

  const defaultPaletteId = 'palette1';

  useEffect(() => {
    if (typeof document !== 'undefined' && !currentUser) {
      document.documentElement.classList.remove('dark');
    }
  }, []); // Run only once on mount

  useEffect(() => {
    let cancelled = false;
    setThemeReady(false);

    import('./themes').then((module) => {
      const palettes = module.palettes;
      if (cancelled) return;
      setAllPalettes(palettes);

      const applyDefault = () => {
        setCurrentPalette(defaultPaletteId);
        applyPaletteColors(defaultPaletteId, palettes);
      };

      const done = () => {
        if (!cancelled) setThemeReady(true);
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
            const themeMode = account?.themeMode || 'light';
            if (themeMode === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
            done();
          })
          .catch(() => {
            if (!cancelled) applyDefault();
            document.documentElement.classList.remove('dark');
            done();
          });
      } else {
        applyDefault();
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark');
        }
        done();
      }
    });

    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser && typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const handleThemeModeUpdate = async (event) => {
      if (event.detail?.type === 'useraccount-updated' && event.detail?.payload?.themeMode) {
        const newThemeMode = event.detail.payload.themeMode;
        if (typeof document !== 'undefined') {
          if (newThemeMode === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    };

    window.addEventListener('useraccount', handleThemeModeUpdate);
    
    return () => {
      window.removeEventListener('useraccount', handleThemeModeUpdate);
    };
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
    if (root.getAttribute('data-palette') === paletteId) {
      if (typeof document !== 'undefined') {
        document.cookie = `gomanagr_palette=${encodeURIComponent(paletteId)};path=/;max-age=31536000;SameSite=Lax`;
      }
      return;
    }

    Object.keys(palette.colors).forEach((colorType) => {
      const colorScale = palette.colors[colorType];
      Object.keys(colorScale).forEach((shade) => {
        const value = colorScale[shade];
        root.style.setProperty(`--color-${colorType}-${shade}`, typeof value === 'string' && value.startsWith('#') ? hexToRgb(value) : value);
      });
    });

    root.setAttribute('data-palette', paletteId);

    if (typeof document !== 'undefined') {
      document.cookie = `gomanagr_palette=${encodeURIComponent(paletteId)};path=/;max-age=31536000;SameSite=Lax`;
    }
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
      {themeReady ? children : null}
    </ThemeContext.Provider>
  );
};
