import { SessionProvider } from "next-auth/react";
import Head from 'next/head';
import '../styles/globals.css'; // Or any other global stylesheet you are using
import { Toaster } from "@/components/ui/sonner"

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Head>
        {/* Default viewport - can be overridden by page-specific Head tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover, user-scalable=yes" />
      </Head>
      <Component {...pageProps} />
      <Toaster />
    </SessionProvider>
  );
}

export default MyApp;