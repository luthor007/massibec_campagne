import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ShoppingCart, User, LogOut, Menu, X, ChevronDown, Trash2, Building2, ShoppingBag, School, Package } from "lucide-react"
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
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState(null);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const isSchoolManager = session?.user?.role === 'school_manager';
  const isSupplier = session?.user?.role === 'supplier';

  // Check if supplier is in preview mode
  const [isSupplierPreview, setIsSupplierPreview] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isSupplier) {
      const viewMode = localStorage.getItem('viewMode');
      const supplierView = localStorage.getItem('supplierView');
      setIsSupplierPreview(viewMode === 'student_preview' && supplierView === 'true');
    }
  }, [isSupplier]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [telephone, setTelephone] = useState(); // Changed from goal to telephone

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (session) {
        setName(session.user.name)
        setEmail(session.user.email)
        setTelephone(session.user.parentInfo?.telephone) // Changed from goal to telephone
      }
    }

    fetchUserInfo()
  }, [session])

  // Fetch school logo based on active campaign
  useEffect(() => {
    const fetchSchoolLogo = async () => {
      if (!session?.user) {
        setSchoolLogo(null);
        return;
      }

      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          const activeCampaignId = data.activeCampaignId;
          const campaigns = data.campaigns || [];

          // Find active campaign
          const activeCampaign = campaigns.find(c =>
            c._id === activeCampaignId || c.isActiveCampaign
          ) || campaigns[0];

          // Get school logo from active campaign
          if (activeCampaign?.school?.logo) {
            setSchoolLogo(activeCampaign.school.logo);
          } else {
            setSchoolLogo(null);
          }
        }
      } catch (error) {
        console.error('Error fetching school logo:', error);
        setSchoolLogo(null);
      }
    };

    fetchSchoolLogo();

    // Listen for campaign changes
    const handleCampaignSwitched = () => {
      fetchSchoolLogo();
    };

    window.addEventListener('campaignSwitched', handleCampaignSwitched);
    return () => {
      window.removeEventListener('campaignSwitched', handleCampaignSwitched);
    };
  }, [session]);

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
        <div className="h-full w-full px-4 sm:px-6 lg:px-8">
          <div className="h-full max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo - links to dashboard if logged in, landing page otherwise */}
            <Link
              href={isAuthenticated ? '/dashboard' : '/'}
              className={`${logoClasses} flex-shrink-0`}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative flex items-center h-full">
                  {schoolLogo ? (
                    <img
                      src={schoolLogo}
                      alt="School Logo"
                      className="object-cover h-10 md:h-12"
                      style={{ objectPosition: 'center top' }}
                    />
                  ) : (
                    <img
                      src="/images/jappuie_logo.svg"
                      alt="Jappuie - Plateforme de financement scolaire"
                      className="object-cover h-10 md:h-12"
                      style={{ objectPosition: 'center top' }}
                    />
                  )}
                </div>
              </motion.div>
            </Link>

            {/* Rest of header content */}
            <nav className="flex items-center">

              <div className="hidden md:flex items-center space-x-4">
                {/* Blog Link - Hidden for logged in students */}
                {!(isAuthenticated && session?.user?.role === 'student') && (
                  <Link href="/blog">
                    <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/20">
                      Blog
                    </Button>
                  </Link>
                )}

                <AnimatePresence>
                  {isLoading ? (
                    // Show loading state to prevent flash of unauthenticated UI
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                    </motion.div>
                  ) : isAuthenticated ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center space-x-4"
                    >
                      {/* Navigation buttons for suppliers */}
                      {isSupplier ? (
                        <div className="flex items-center space-x-2">
                          {/* Portail Fournisseur - Active when on dashboard-supplier */}
                          {router.pathname === '/dashboard-supplier' || router.pathname.startsWith('/dashboard-supplier/') ? (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border-2 border-blue-500 rounded-lg shadow-sm">
                              <Package className="h-4 w-4 text-blue-700" />
                              <span className="text-sm font-semibold text-blue-700">Portail Fournisseur</span>
                            </div>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                if (typeof window !== 'undefined') {
                                  localStorage.removeItem('viewMode');
                                  localStorage.removeItem('supplierView');
                                }
                                router.push('/dashboard-supplier');
                              }}
                              variant="outline"
                              size="sm"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Portail Fournisseur</span>
                              <span className="sm:hidden">Fournisseur</span>
                            </Button>
                          )}

                          {/* Portail Organisation */}
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('viewMode', 'school_preview');
                                localStorage.setItem('supplierView', 'true');
                              }
                              router.push('/dashboard-manager');
                            }}
                            variant="outline"
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <School className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Portail Organisation</span>
                            <span className="sm:hidden">Organisation</span>
                          </Button>

                          {/* Portail Vendeur - Active when on dashboard or in preview mode */}
                          {(router.pathname === '/dashboard' || router.pathname.startsWith('/dashboard/') || isSupplierPreview) ? (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 border-2 border-purple-500 rounded-lg shadow-sm">
                              <ShoppingBag className="h-4 w-4 text-purple-700" />
                              <span className="text-sm font-semibold text-purple-700">Portail Vendeur</span>
                            </div>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('viewMode', 'student_preview');
                                  localStorage.setItem('supplierView', 'true');
                                }
                                router.push('/dashboard');
                              }}
                              variant="outline"
                              size="sm"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Portail Vendeur</span>
                              <span className="sm:hidden">Vendeur</span>
                            </Button>
                          )}
                        </div>
                      ) : isSchoolManager ? (
                        <div className="flex items-center space-x-2">
                          {/* Portail Organisation - Active when on dashboard-manager */}
                          {router.pathname === '/dashboard-manager' ? (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border-2 border-green-500 rounded-lg shadow-sm">
                              <School className="h-4 w-4 text-green-700" />
                              <span className="text-sm font-semibold text-green-700">Portail Organisation</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md"
                              asChild
                            >
                              <Link href="/dashboard-manager">
                                <School className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Portail Organisation</span>
                                <span className="sm:hidden">Organisation</span>
                              </Link>
                            </Button>
                          )}

                          {/* Portail Vendeur - Active when on dashboard */}
                          {router.pathname === '/dashboard' || router.pathname.startsWith('/dashboard/') ? (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 border-2 border-purple-500 rounded-lg shadow-sm">
                              <ShoppingBag className="h-4 w-4 text-purple-700" />
                              <span className="text-sm font-semibold text-purple-700">Portail Vendeur</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md"
                              asChild
                            >
                              <Link href="/dashboard">
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Portail Vendeur</span>
                                <span className="sm:hidden">Vendeur</span>
                              </Link>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button variant="secondary" size="sm" asChild>
                          <Link href="/dashboard">
                            Tableau de bord
                          </Link>
                        </Button>
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
                      <Button variant="secondary" size="sm" asChild>
                        <Link href="/inscription">
                          S&apos;inscrire
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href="/connexion">
                          <User className="mr-2 h-4 w-4" />
                          Connexion
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href="/inscription-manager">
                          Inscrire mon école
                        </Link>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu button - positioned on the right */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-foreground flex-shrink-0 ml-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </nav>
          </div>
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

              {isLoading ? (
                // Mobile loading state
                <div className="p-4 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                </div>
              ) : isAuthenticated ? (
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

                  {isSupplier ? (
                    <>
                      {/* Portail Fournisseur - Active when on dashboard-supplier */}
                      {router.pathname === '/dashboard-supplier' || router.pathname.startsWith('/dashboard-supplier/') ? (
                        <div className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-50 border-2 border-blue-500 rounded-lg">
                          <Package className="h-4 w-4 text-blue-700" />
                          <span className="text-sm font-semibold text-blue-700">Portail Fournisseur</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMobileMenuOpen(false);
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('viewMode');
                              localStorage.removeItem('supplierView');
                            }
                            setTimeout(() => {
                              router.push('/dashboard-supplier');
                            }, 100);
                          }}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Portail Fournisseur
                        </Button>
                      )}

                      {/* Portail Organisation */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(false);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('viewMode', 'school_preview');
                            localStorage.setItem('supplierView', 'true');
                          }
                          setTimeout(() => {
                            router.push('/dashboard-manager');
                          }, 100);
                        }}
                      >
                        <School className="h-4 w-4 mr-2" />
                        Portail Organisation
                      </Button>

                      {/* Portail Vendeur - Active when on dashboard or in preview mode */}
                      {(router.pathname === '/dashboard' || router.pathname.startsWith('/dashboard/') || isSupplierPreview) ? (
                        <div className="w-full flex items-center space-x-2 px-3 py-2 bg-purple-50 border-2 border-purple-500 rounded-lg">
                          <ShoppingBag className="h-4 w-4 text-purple-700" />
                          <span className="text-sm font-semibold text-purple-700">Portail Vendeur</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMobileMenuOpen(false);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('viewMode', 'student_preview');
                              localStorage.setItem('supplierView', 'true');
                            }
                            setTimeout(() => {
                              router.push('/dashboard');
                            }, 100);
                          }}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Portail Vendeur
                        </Button>
                      )}

                      <DropdownMenuSeparator className="bg-gray-100" />
                      {/* Profile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProfileClick();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profil
                      </Button>
                    </>
                  ) : isSchoolManager ? (
                    <>
                      {/* Portail Organisation */}
                      {router.pathname === '/dashboard-manager' ? (
                        <div className="w-full flex items-center space-x-2 px-3 py-2 bg-green-50 border-2 border-green-500 rounded-lg">
                          <School className="h-4 w-4 text-green-700" />
                          <span className="text-sm font-semibold text-green-700">Portail Organisation</span>
                        </div>
                      ) : (
                        <Link href="/dashboard-manager" passHref>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <School className="h-4 w-4 mr-2" />
                            Portail Organisation
                          </Button>
                        </Link>
                      )}
                      {/* Portail Vendeur */}
                      {router.pathname === '/dashboard' || router.pathname.startsWith('/dashboard/') ? (
                        <div className="w-full flex items-center space-x-2 px-3 py-2 bg-purple-50 border-2 border-purple-500 rounded-lg">
                          <ShoppingBag className="h-4 w-4 text-purple-700" />
                          <span className="text-sm font-semibold text-purple-700">Portail Vendeur</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMobileMenuOpen(false);
                            // Use setTimeout to ensure menu closes before navigation
                            setTimeout(() => {
                              router.push('/dashboard');
                            }, 100);
                          }}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Portail Vendeur
                        </Button>
                      )}
                      <DropdownMenuSeparator className="bg-gray-100" />
                      {/* Profile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMobileMenuOpen(false);
                          }}
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
                    onClick={(e) => {
                      e.stopPropagation();
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
                  <Link href="/blog" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Blog
                    </Button>
                  </Link>
                  <Link href="/inscription" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      S&apos;inscrire
                    </Button>
                  </Link>
                  <Link href="/connexion" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                      }}
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