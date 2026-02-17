import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import { useTheme } from '@/lib/ThemeContext';
import Toggle from '@/components/ui/Toggle';

export default function ThemeSettings() {
  const { currentUser } = useAuth();
  const { currentPalette, setPalette } = useTheme();
  const [allPalettes, setAllPalettes] = useState({});
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState('light');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    import('@/lib/themes').then((module) => {
      setAllPalettes(module.palettes);
      setLoading(false);
    });
  }, []);

  // Load theme mode preference
  useEffect(() => {
    if (currentUser?.uid) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          const mode = data?.themeMode || 'light';
          setThemeMode(mode);
          // Apply dark mode class to document only if user has dark mode preference
          if (typeof document !== 'undefined') {
            if (mode === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        })
        .catch(() => {
          // Default to light mode on error
          setThemeMode('light');
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark');
          }
        });
    } else {
      // No user logged in - ensure light mode
      setThemeMode('light');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [currentUser?.uid]);

  const handleThemeModeChange = async (newMode) => {
    setThemeMode(newMode);
    
    // Apply dark mode class to document immediately and forcefully
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement;
      if (newMode === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        // Forcefully remove dark class - ensure it's completely removed
        htmlElement.classList.remove('dark');
        // Double-check: if somehow still present, remove again
        if (htmlElement.classList.contains('dark')) {
          htmlElement.classList.remove('dark');
        }
      }
    }

    // Save to Firebase (merge: true in createUserAccount preserves existing fields)
    if (currentUser?.uid) {
      try {
        setSaving(true);
        // Load existing account data first to preserve it
        const existingAccount = await getUserAccount(currentUser.uid);
        await createUserAccount(
          currentUser.uid,
          {
            ...(existingAccount || {}),
            themeMode: newMode,
            userId: currentUser.uid,
            email: currentUser.email,
          },
          null
        );
        // Dispatch event to update other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('useraccount', {
              detail: {
                type: 'useraccount-updated',
                payload: { themeMode: newMode },
              },
            })
          );
        }
      } catch (err) {
        console.error('Error saving theme mode:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handlePaletteSelect = (paletteId) => {
    if (paletteId && allPalettes[paletteId]) {
      setPalette(paletteId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Theme Settings</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Customize your application appearance</p>

      {/* Theme Mode Toggle */}
      <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <Toggle
            id="themeMode"
            label="Theme Mode"
            value={themeMode || 'light'}
            onValueChange={handleThemeModeChange}
            option1="light"
            option1Label="Light"
            option2="dark"
            option2Label="Dark"
            variant="light"
            disabled={saving}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-1">
            {themeMode === 'light' 
              ? 'Light mode provides a clean, bright interface that\'s easy on the eyes during daytime use.'
              : 'Dark mode reduces eye strain in low-light conditions and provides a modern, sleek appearance.'}
          </p>
        </div>
      </div>

      {/* Color Palette Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Color Palette</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Choose a color palette that matches your style</p>
        {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(allPalettes).map((paletteId) => {
            const palette = allPalettes[paletteId];
            const isSelected = currentPalette === paletteId;
            return (
              <button
                key={paletteId}
                onClick={() => handlePaletteSelect(paletteId)}
                className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  isSelected ? 'border-primary-500 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                }`}
              >
                <div className="relative h-32 overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${palette?.colors?.primary?.[500] || '#06b6d4'} 0%, ${palette?.colors?.primary?.[600] || '#0891b2'} 100%)`,
                      clipPath: 'polygon(0 0, 45% 0, 0 265%)',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${palette?.colors?.secondary?.[500] || '#0284c7'} 0%, ${palette?.colors?.secondary?.[600] || '#0369a1'} 100%)`,
                      clipPath: 'polygon(45% 0, 75% 0, 45% 170%, 5% 225%)',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${palette?.colors?.ternary?.[500] || '#10b981'} 0%, ${palette?.colors?.ternary?.[600] || '#059669'} 100%)`,
                      clipPath: 'polygon(75% 0, 100% 0, 100% 100%, 45% 170%)',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
                  <div className="absolute inset-0 z-10 flex flex-col justify-end px-4 pb-4">
                    <h3 className="font-semibold text-white mb-1 drop-shadow-lg text-left">{palette?.name || paletteId}</h3>
                    <p className="text-xs text-white/90 drop-shadow-md text-left">{palette?.description || ''}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 z-20">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary-500">
                      <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
