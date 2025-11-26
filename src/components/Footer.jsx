import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground pb-safe">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile-optimized layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-6 md:py-8">
          {/* About section */}
          <div className="text-center md:text-left">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">À propos</h3>
            <p className="text-xs md:text-sm leading-relaxed max-w-md mx-auto md:mx-0">
              Jappuie.ca est une plateforme qui aide les élèves à atteindre leurs objectifs de financement en vendant des produits délicieux de fournisseurs 100% québécois.
            </p>
          </div>

          {/* Quick links section */}
          <div className="text-center md:text-left">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Liens rapides</h3>
            <ul className="space-y-2.5 md:space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-xs md:text-sm hover:underline inline-block py-1.5 md:py-0 transition-colors"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/inscription"
                  className="text-xs md:text-sm hover:underline inline-block py-1.5 md:py-0 transition-colors"
                >
                  Inscription
                </Link>
              </li>
              <li>
                <Link
                  href="/connexion"
                  className="text-xs md:text-sm hover:underline inline-block py-1.5 md:py-0 transition-colors"
                >
                  Connexion
                </Link>
              </li>
              <li>
                <Link
                  href="/boutique/1"
                  className="text-xs md:text-sm hover:underline inline-block py-1.5 md:py-0 transition-colors"
                >
                  Boutique
                </Link>
              </li>
              <li>
                <Link
                  href="/distributeur"
                  className="text-xs md:text-sm hover:underline inline-block py-1.5 md:py-0 transition-colors"
                >
                  Devenir un distributeur
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright section */}
        <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-muted-foreground/20 text-center">
          <p className="text-xs md:text-sm text-muted-foreground/80">
            &copy; {new Date().getFullYear()} Jappuie.ca. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}