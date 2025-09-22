import Header from './Header'
import Footer from './Footer'
import "../styles/globals.css";

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header/>
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 mt-16">
        {children}
      </main>
      <Footer />
    </div>
  )
}