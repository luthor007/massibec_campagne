import { SessionProvider } from "next-auth/react";
import '../styles/globals.css'; // Or any other global stylesheet you are using

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;