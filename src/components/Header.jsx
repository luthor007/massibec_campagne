import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ShoppingCart, User, LogOut, Menu, X, ChevronDown, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSchoolManager = session?.user?.role === 'school_manager';
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [telephone, setTelephone] = useState(); // Changed from goal to telephone

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (session) {
        setName(session.user.name)
        setEmail(session.user.email)
        setTelephone(session.user.parentInfo.telephone) // Changed from goal to telephone
      }
    }

    fetchUserInfo()
  }, [session])

  const handleProfileClick = () => {
    setShowProfileModal(true);
  };

  const handleProfileUpdate = async () => {
    try {
      const response = await fetch('/api/updateProfile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, telephone }), // Added telephone to the update payload
      });
      if (response.ok) {
        toast.success("Profil mis à jour avec succès!");
        setShowProfileModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la mise à jour du profil");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur est survenue lors de la mise à jour du profil.");
    }
  };

  const handleDeleteAccount = async () => {
    toast("Êtes-vous sûr de vouloir supprimer votre compte ?", {
      description: "Cette action est irréversible.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          try {
            const response = await fetch('/api/deleteAccount', { method: 'DELETE' });
            if (response.ok) {
              toast.success("Compte supprimé avec succès.");
              await handleLogout();
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || "Erreur lors de la suppression du compte");
            }
          } catch (error) {
            console.error("Erreur:", error);
            toast.error("Une erreur est survenue lors de la suppression du compte.");
          }
        },
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const headerClasses = `fixed w-full z-50 transition-all duration-300 ${
    isScrolled ? 'bg-white' : 'bg-primary/90 backdrop-blur-sm'
  }`;

  const logoClasses = `text-2xl font-bold tracking-tight transition-colors text-primary-foreground`;

  return (
    <>
    <header className={headerClasses}>
      <div className="container mx-auto px-4 py-4 sm:px-10 lg:px-12">
        <nav className="flex justify-between items-center">
          <Link href="/" className={logoClasses}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative h-full overflow-hidden">
                <img
                  src="/images/logo_massibec.png"
                  alt="Massibec Fundraising Logo"
                  className="object-cover h-[calc(100%-20%)] max-h-16 md:max-h-20 pb-4" // Adjust height for mobile
                  style={{ objectPosition: 'center top' }}
                />
              </div>
            </motion.div>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <AnimatePresence>
              {session ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center space-x-4"
                >
                  <Link href={isSchoolManager ? "/dashboard-manager" : "/dashboard"} passHref>
                    <Button variant="secondary" size="sm">
                      Tableau de bord
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="flex items-center">
                        <Avatar className="w-6 h-6 mr-2">
                          <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                          <AvatarFallback>{session.user?.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        {session.user?.name}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white text-lg">
                      <DropdownMenuItem onClick={handleProfileClick}>
                        <User className="mr-2 h-4 w-4" /> Profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center space-x-4"
                >
                  <Link href="/inscription" passHref>
                    <Button variant="secondary" size="sm">
                      S&apos;inscrire
                    </Button>
                  </Link>
                  <Link href="/connexion" passHref>
                    <Button variant="secondary" size="sm">
                      <User className="mr-2 h-4 w-4" />
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/inscription-manager" passHref>
                    <Button variant="secondary" size="sm">
                      Inscrire mon école
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden mt-4 space-y-4 bg-white p-4 rounded-lg"
            >
              {session ? (
                <>
                  <Link href={isSchoolManager ? "/dashboard-manager" : "/dashboard"} passHref>
                    <Button variant="ghost" size="lg" className="w-full justify-start text-primary-foreground text-xl">
                      Tableau de bord
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start text-primary-foreground text-xl"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/inscription" passHref>
                    <Button variant="ghost" size="lg" className="w-full justify-start text-primary-foreground text-xl">
                      S&apos;inscrire
                    </Button>
                  </Link>
                  <Link href="/connexion" passHref>
                    <Button variant="ghost" size="lg" className="w-full justify-start text-primary-foreground text-xl">
                      <User className="mr-2 h-4 w-4" /> Connexion
                    </Button>
                  </Link>
                  <Link href="/inscription-manager" passHref>
                    <Button variant="ghost" size="lg" className="w-full justify-start text-primary-foreground text-xl">
                      Inscrire mon école
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="bg-white p-6 rounded-lg shadow-md">
          <DialogHeader>
            <DialogTitle>Mon Profil</DialogTitle>
            <DialogDescription>Consultez et mettez à jour vos informations de profil ou supprimez votre compte.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-6 space-y-4">
            <Button onClick={handleProfileUpdate}>Mettre à jour le profil</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer le compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
  );
}