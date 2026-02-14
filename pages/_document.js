import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
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
