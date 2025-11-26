// components/Dashboard/Sidebar.jsx
import React from 'react';
import { Home, School, Package, ShoppingCart, Settings, X, Calendar, BarChart3, Users, TrendingUp, Lock, FileText, Truck, Gavel } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
import { useBlockNavigation } from '../../hooks/useBlockNavigation';
import { toast } from 'sonner';

const Sidebar = ({ onClose, currentRoute, allowedRoutes = [] }) => {
  const router = useRouter();
  const { canNavigate, handleNavigation, isOnboardingComplete } = useBlockNavigation(allowedRoutes);

  // Detect which dashboard context we're in based on current route
  const isSupplierDashboard = router.pathname.startsWith('/dashboard-supplier');
  const isDistributorDashboard = router.pathname.startsWith('/dashboard-distributor');
  const basePath = isDistributorDashboard
    ? '/dashboard-distributor'
    : isSupplierDashboard
      ? '/dashboard-supplier'
      : '/dashboard-massibec';

  // Different navigation items based on dashboard type
  const getNavigationItems = () => {
    if (isDistributorDashboard) {
      return [
        {
          name: 'Vue d\'ensemble',
          href: basePath,
          icon: Home,
          description: 'Tableau de bord'
        },
        {
          name: 'Livraisons',
          href: `${basePath}/shipments`,
          icon: Truck,
          description: 'Livraisons disponibles'
        },
        {
          name: 'Mes enchères',
          href: `${basePath}/bids`,
          icon: Gavel,
          description: 'Enchères soumises'
        },
        {
          name: 'Paramètres',
          href: `${basePath}/settings`,
          icon: Settings,
          description: 'Configuration'
        }
      ];
    }

    // Supplier/Manager dashboard items
    return [
      {
        name: 'Overview',
        href: basePath,
        icon: Home,
        description: 'Vue d\'ensemble'
      },
      {
        name: 'Gestion des Écoles',
        href: `${basePath}/schools`,
        icon: School,
        description: 'Écoles et directeurs'
      },
      {
        name: 'Gestion des Campagnes',
        href: `${basePath}/campaigns`,
        icon: Calendar,
        description: 'Campagnes et objectifs'
      },
      {
        name: 'Gestion des Produits',
        href: `${basePath}/products`,
        icon: Package,
        description: 'Catalogue produits'
      },
      {
        name: 'Gestion des Commandes',
        href: `${basePath}/orders`,
        icon: ShoppingCart,
        description: 'Commandes et livraisons'
      },
      {
        name: 'Analytics',
        href: `${basePath}/analytics`,
        icon: BarChart3,
        description: 'Rapports et statistiques'
      },
      {
        name: 'Rapports',
        href: `${basePath}/reports`,
        icon: FileText,
        description: 'Génération de rapports'
      },
      {
        name: 'Paramètres',
        href: `${basePath}/settings`,
        icon: Settings,
        description: 'Configuration'
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen lg:h-full flex flex-col shadow-xl overflow-hidden max-h-screen">
      {/* Header with logo and close button */}
      <div className="p-4 sm:p-5 lg:p-6 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold truncate">Jappuie</h2>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">
              {isDistributorDashboard ? 'Distributeur Dashboard' : 'Fournisseur Dashboard'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0 ml-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col p-3 sm:p-4 space-y-1 flex-1 overflow-y-auto min-h-0 max-h-full">
        {navigationItems.map((item) => {
          // Improved active state detection: exact match or starts with (for sub-routes)
          // Special case: Overview should only match exactly, not sub-routes
          const isActive = item.href === basePath
            ? router.pathname === item.href
            : router.pathname === item.href || router.pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const isBlocked = !canNavigate(item.href);
          const isAllowed = allowedRoutes.includes(item.href);

          return (
            <div key={item.href} className="relative flex-shrink-0">
              {isBlocked && !isAllowed ? (
                <div
                  className={`flex items-center p-2.5 sm:p-3 rounded-lg transition-all duration-200 group cursor-not-allowed opacity-50 ${isActive
                    ? 'bg-gray-700 text-gray-400'
                    : 'text-gray-500'
                    }`}
                  title="Complétez l'onboarding pour accéder à cette section"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.error('Complétez l\'onboarding pour accéder à cette section');
                  }}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-gray-500 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-600 truncate">
                      {item.description}
                    </div>
                  </div>
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                </div>
              ) : (
                <Link href={item.href} passHref legacyBehavior>
                  <a
                    className={`flex items-center p-2.5 sm:p-3 rounded-lg transition-all duration-200 group ${isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    onClick={(e) => {
                      if (!handleNavigation(item.href, e)) {
                        toast.error('Complétez l\'onboarding pour accéder à cette section');
                        return;
                      }
                      e.stopPropagation();
                      onClose();
                    }}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                      <div className={`text-[10px] sm:text-xs truncate ${isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-300'}`}>
                        {item.description}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full flex-shrink-0"></div>
                    )}
                  </a>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer with user info */}
      <div className="p-3 sm:p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800 rounded-lg">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-medium truncate">
              {isDistributorDashboard ? 'Distributeur' : 'Fournisseur'}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400 truncate">Jappuie</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;