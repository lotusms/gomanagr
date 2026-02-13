import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedPalette = localStorage.getItem('selectedPalette');
                  if (savedPalette) {
                    document.documentElement.setAttribute('data-palette', savedPalette);
                  }
                } catch (e) {
                  // localStorage might not be available
                }
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
