import Header from './Header'
import Footer from './Footer'
import { useSession } from 'next-auth/react'
import "../styles/globals.css";

export default function Layout({ children }) {
  const { data: session, status } = useSession();
  
  // Show footer only when user is not connected (on landing page)
  const showFooter = !session && status !== 'loading';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header/>
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 mt-16">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}