import NextDocument, { Html, Head, Main, NextScript } from 'next/document';
import { getThemeColorsRgb } from '../config/themes';

const COOKIE_NAME = 'gomanagr_palette';

function getPaletteIdFromCookie(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const match = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split('=')[1]?.trim() || '');
  } catch {
    return null;
  }
}

export default function Document({ themeInitScript }) {
  return (
    <Html>
      <Head>
        {/* Ensure dark mode is NOT applied on initial load - only apply when user is logged in and has dark mode preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof document!=='undefined'){document.documentElement.classList.remove('dark');}})();`,
          }}
        />
        {themeInitScript ? (
          <script
            dangerouslySetInnerHTML={{
              __html: themeInitScript,
            }}
          />
        ) : null}
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="apple-touch-icon" sizes="192x192" href="/favicon/web-app-manifest-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/favicon/web-app-manifest-512x512.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

function buildThemeScript(paletteId) {
  try {
    const colors = getThemeColorsRgb(paletteId);
    const entries = Object.entries(colors);
    if (entries.length === 0) return null;
    const lines = entries.map(([key, value]) => `d.style.setProperty('${key}','${value}');`).join('');
    const safeId = paletteId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `(function(){var d=document.documentElement;${lines}d.setAttribute('data-palette','${safeId}');})();`;
  } catch (_) {
    return null;
  }
}

Document.getInitialProps = async (ctx) => {
  const initialProps = await NextDocument.getInitialProps(ctx);
  const paletteId = getPaletteIdFromCookie(ctx.req?.headers?.cookie);
  const themeInitScript = paletteId ? buildThemeScript(paletteId) : null;
  return { ...initialProps, themeInitScript };
};
