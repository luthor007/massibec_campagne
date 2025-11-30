import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="fr-CA">
      <Head>
        {/* Note: title and viewport should be in _app.js or page-specific Head tags, not here */}

        {/* Mobile optimization */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Jappuie" />

        {/* Favicon - Multiple sizes for better browser and search engine support */}
        {/* Google looks for /favicon.ico first, so we include it */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_jappuie.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon_jappuie.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon_jappuie.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/images/favicon_jappuie.png" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/png" href="/images/favicon_jappuie.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon_jappuie.png" />
        <link rel="apple-touch-icon" href="/images/favicon_jappuie.png" />
        <meta name="msapplication-TileImage" content="/images/favicon_jappuie.png" />

        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#2563eb" />

        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Security Headers - Note: X-Frame-Options, X-Content-Type-Options, and Referrer-Policy 
            are already set via HTTP headers in next.config.mjs for better browser support */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
