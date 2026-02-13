import { useState, useEffect } from 'react';
import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTheme } from '@/client/lib/ThemeContext';

function SettingsContent() {
  const { currentPalette, setPalette, palettes } = useTheme();
  const [allPalettes, setAllPalettes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Import palettes dynamically from client-safe module
    import('@/client/lib/themes').then((module) => {
      setAllPalettes(module.palettes);
      setLoading(false);
    });
  }, []);

  const handlePaletteSelect = (paletteId) => {
    if (paletteId && allPalettes[paletteId]) {
      setPalette(paletteId);
    }
  };

  return (
    <>
      <Head>
        <title>Settings - GoManagr</title>
        <meta name="description" content="Application settings" />
      </Head>

      <div className="space-y-6 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and application settings</p>
        </div>

        {/* Theme Selection Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select your theme</h2>
          <p className="text-sm text-gray-600 mb-6">Choose a color palette that matches your style</p>
          
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
                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {/* Color Preview */}
                  <div className="flex gap-2 mb-3">
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: palette?.colors?.primary?.[500] || '#06b6d4' }}
                    />
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: palette?.colors?.secondary?.[500] || '#0284c7' }}
                    />
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: palette?.colors?.ternary?.[500] || '#10b981' }}
                    />
                  </div>
                  
                  {/* Palette Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{palette?.name || paletteId}</h3>
                    <p className="text-xs text-gray-600">{palette?.description || ''}</p>
                  </div>
                  
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">More settings coming soon...</p>
        </div>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
