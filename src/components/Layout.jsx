import Header from './Header'
import Footer from './Footer'
import { useSession } from 'next-auth/react'
import "../styles/globals.css";
import "../styles/mobile-optimizations.css";

export default function Layout({ children }) {
  const { data: session, status } = useSession();

  // Show footer only when user is not connected (on landing page)
  const showFooter = !session && status !== 'loading';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden w-full">
      <Header />
      <main className="flex-grow w-full px-4 py-8 sm:px-6 lg:px-8 pt-16 md:pt-20 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      {showFooter && <Footer />}
    </div>
  )
}