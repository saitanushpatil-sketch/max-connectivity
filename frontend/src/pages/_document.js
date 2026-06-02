import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00F5FF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MAX" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="prefetch" href="/chats" />
        <link rel="prefetch" href="/chat" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maxconnectivity-production.up.railway.app" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body style={{ background: '#0A0A0F' }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
