import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ShoppingCart, User, LogOut, Menu, X, ChevronDown, Trash2, Building2, ShoppingBag } from "lucide-react"
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
        onClick: () => { },
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

  const headerClasses = `fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white' : 'bg-primary/90 backdrop-blur-sm'
    }`;

  const logoClasses = `text-2xl font-bold tracking-tight transition-colors text-primary-foreground`;

  return (
    <>
      <header className={`${headerClasses} h-16 md:h-20`}>
        <div className="container mx-auto px-4 py-3 sm:px-10 lg:px-12 h-full flex items-center">
          <nav className="flex justify-between items-center w-full">
            <Link href="/" className={logoClasses}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative flex items-center h-full">
                  <img
                    src="/images/logo_massibec.png"
                    alt="Massibec Fundraising Logo"
                    className="object-cover h-10 md:h-14"
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
                    {/* Navigation buttons for school managers */}
                    {isSchoolManager ? (
                      <>
                        <Link href="/dashboard-manager" passHref>
                          <Button
                            variant={router.pathname === '/dashboard-manager' ? 'default' : 'outline'}
                            size="sm"
                            className="flex items-center space-x-2"
                          >
                            <Building2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Portail Organisation</span>
                            <span className="sm:hidden">Organisation</span>
                          </Button>
                        </Link>
                        <Link href="/dashboard" passHref>
                          <Button
                            variant={router.pathname === '/dashboard' ? 'default' : 'outline'}
                            size="sm"
                            className="flex items-center space-x-2"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            <span className="hidden sm:inline">Portail Vendeur</span>
                            <span className="sm:hidden">Vendeur</span>
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link href="/dashboard" passHref>
                        <Button variant="secondary" size="sm">
                          Tableau de bord
                        </Button>
                      </Link>
                    )}

                    {/* Profile Menu Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center space-x-2 hover:bg-gray-100">
                          <Avatar className="w-8 h-8 border-2 border-gray-200">
                            <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                              {session.user?.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden lg:inline">{session.user?.name}</span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-xl rounded-lg">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <div className="text-sm font-semibold text-gray-900">{session.user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{session.user.email}</div>
                        </div>
                        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 py-2.5">
                          <User className="mr-2 h-4 w-4 text-gray-600" />
                          <span className="text-sm">Profil</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-100" />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 py-2.5">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span className="text-sm font-medium">Déconnexion</span>
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
        </div>
      </header>

      {/* Mobile menu dropdown with overlay - outside header */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Mobile menu */}
          <div className="md:hidden fixed top-0 right-0 h-screen w-80 max-w-[85vw] bg-white shadow-2xl z-[70] overflow-y-auto overflow-x-hidden">
            <div className="p-4 space-y-4">
              {/* Close button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {session ? (
                <>
                  {/* Profile Info */}
                  <div className="pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3 p-3">
                      <Avatar className="w-10 h-10 border-2 border-gray-200">
                        <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                          {session.user?.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{session.user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{session.user.email}</div>
                      </div>
                    </div>
                  </div>

                  {isSchoolManager ? (
                    <>
                      {/* Portail Organisation */}
                      <Link href="/dashboard-manager" passHref>
                        <Button
                          variant={router.pathname === '/dashboard-manager' ? 'default' : 'outline'}
                          size="sm"
                          className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Portail Organisation
                        </Button>
                      </Link>
                      {/* Portail Vendeur */}
                      <Button
                        variant={router.pathname === '/dashboard' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          router.push('/dashboard');
                        }}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Portail Vendeur
                      </Button>
                      <DropdownMenuSeparator className="bg-gray-100" />
                      {/* Profile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          handleProfileClick();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profil
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/dashboard" passHref>
                        <Button
                          variant={router.pathname === '/dashboard' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start text-xl"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Tableau de bord
                        </Button>
                      </Link>
                      <DropdownMenuSeparator className="bg-gray-100" />
                      {/* Profile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          handleProfileClick();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profil
                      </Button>
                    </>
                  )}

                  {/* Logout */}
                  <Button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/inscription" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      S&apos;inscrire
                    </Button>
                  </Link>
                  <Link href="/connexion" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/inscription-manager" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Inscrire mon école
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}

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