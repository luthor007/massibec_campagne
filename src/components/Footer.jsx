import Link from 'next/link'
import { Facebook, Instagram, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">À propos</h3>
            <p className="text-sm">Campagne Massibec aide les élèves à atteindre leurs objectifs de financement en vendant des produits délicieux.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:underline">Accueil</Link></li>
              <li><Link href="/inscription" className="hover:underline">Inscription</Link></li>
              <li><Link href="/connexion" className="hover:underline">Connexion</Link></li>
              <li><Link href="/boutique/1" className="hover:underline">Boutique</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-muted-foreground/20 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Campagne Massibec. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}