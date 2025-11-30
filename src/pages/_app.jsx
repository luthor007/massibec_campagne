import { useEffect } from 'react';
import { SessionProvider } from "next-auth/react";
import Head from 'next/head';
import Script from 'next/script';
import Clarity from '@microsoft/clarity';
import '../styles/globals.css'; // Or any other global stylesheet you are using
import { Toaster } from "@/components/ui/sonner"

const GA_MEASUREMENT_ID = 'G-RL5LDGCBWG';
const CLARITY_PROJECT_ID = 'uc5xnwzbhn'; // Replace with your Clarity project ID from Settings > Overview

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // Initialize Microsoft Clarity
  useEffect(() => {
    if (CLARITY_PROJECT_ID && CLARITY_PROJECT_ID !== 'YOUR_CLARITY_PROJECT_ID') {
      Clarity.init(CLARITY_PROJECT_ID);
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <Head>
        {/* Default viewport - can be overridden by page-specific Head tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover, user-scalable=yes" />
      </Head>

      {/* Google Analytics */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>

      <Component {...pageProps} />
      <Toaster />
    </SessionProvider>
  );
}

export default MyApp;