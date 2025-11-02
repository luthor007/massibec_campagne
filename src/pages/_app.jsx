import { SessionProvider } from "next-auth/react";
import '../styles/globals.css'; // Or any other global stylesheet you are using
import { Toaster } from "@/components/ui/sonner"

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <Toaster />
    </SessionProvider>
  );
}

export default MyApp;