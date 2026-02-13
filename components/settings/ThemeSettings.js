import { useState, useEffect } from 'react';
import { useTheme } from '@/client/lib/ThemeContext';

export default function ThemeSettings() {
  const { currentPalette, setPalette } = useTheme();
  const [allPalettes, setAllPalettes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Select your theme</h2>
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
                className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  isSelected ? 'border-primary-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
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
  );
}
