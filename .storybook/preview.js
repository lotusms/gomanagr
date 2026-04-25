import '../styles/globals.scss';
import { useEffect, useRef, useState } from 'react';

function DynamicStoryCanvas({ Story, canvasStyle }) {
  const wrapperRef = useRef(null);
  const [extraBottomSpace, setExtraBottomSpace] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const updateOpenStatePadding = () => {
      if (!wrapperRef.current) return;
      const hasOpenOverlayTrigger = wrapperRef.current.querySelector(
        '[aria-expanded="true"], [data-state="open"]'
      );
      setExtraBottomSpace(hasOpenOverlayTrigger ? 220 : 0);
    };

    updateOpenStatePadding();

    const mutationObserver = new MutationObserver(updateOpenStatePadding);
    mutationObserver.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state', 'aria-expanded'],
    });

    window.addEventListener('resize', updateOpenStatePadding);

    return () => {
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateOpenStatePadding);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        paddingTop: '1rem',
        paddingRight: '1rem',
        paddingLeft: '1rem',
        overflow: 'visible',
        paddingBottom: `${16 + extraBottomSpace}px`,
        ...canvasStyle,
      }}
    >
      <Story />
    </div>
  );
}

/** @type { import('@storybook/nextjs-vite').Preview } */
const preview = {
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      if (typeof document !== 'undefined') {
        const root = document.documentElement;

        // Force a visible default palette in Storybook so brand colors render clearly.
        root.style.setProperty('--color-primary-500', '45 74 124');
        root.style.setProperty('--color-primary-600', '30 58 107');
        root.style.setProperty('--color-primary-700', '22 45 87');
        root.style.setProperty('--color-secondary-500', '217 119 6');
        root.style.setProperty('--color-ternary-500', '100 116 139');
        root.setAttribute('data-palette', 'palette3');
        root.classList.remove('dark');

        if (!document.getElementById('storybook-docs-overflow-fix')) {
          const style = document.createElement('style');
          style.id = 'storybook-docs-overflow-fix';
          style.textContent = `
            /* Keep Docs story wrappers from clipping popovers/calendars */
            .sbdocs .docs-story,
            .sbdocs .docblock-story,
            .sbdocs .docblock-story > div,
            .sbdocs .docblock-story > div > div,
            .sbdocs [class*="docs-story"],
            .sbdocs [class*="docblock-story"],
            .sbdocs [class*="sb-story"],
            .sbdocs [class*="sb-story"] > div,
            .sbdocs [class*="sb-story"] > div > div {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }

            .sbdocs .docs-story,
            .sbdocs .docs-story > div,
            .sbdocs .sb-story,
            .sbdocs .sb-story > div,
            .sbdocs .sb-story > div > div {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
          `;
          document.head.appendChild(style);
        }
      }

      const variantFromArgs = context?.args?.variant;
      const variantFromArgTypesDefault = context?.argTypes?.variant?.table?.defaultValue?.summary;
      const variantFromParameters = context?.parameters?.themeVariant;
      const effectiveVariant = String(
        variantFromArgs ?? variantFromArgTypesDefault ?? variantFromParameters ?? ''
      ).toLowerCase();
      const isLightVariant = effectiveVariant === 'dark';
      const isDarkVariant = effectiveVariant === 'light';

      const canvasStyle = isLightVariant
        ? { backgroundColor: '#0f172a', color: '#f8fafc' } // Dark viewer for light components
        : isDarkVariant
          ? { backgroundColor: '#f8fafc', color: '#0f172a' } // Light viewer for dark components
          : { backgroundColor: '#f3f4f6', color: '#111827' }; // Neutral fallback

      return <DynamicStoryCanvas Story={Story} canvasStyle={canvasStyle} />;
    },
  ],
  parameters: {
    docs: {
      inlineStories: true,
      iframeHeight: 420,
      story: {
        inline: true,
      },
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo"
    }
  },
};

export default preview;