// components/Dashboard/Sidebar.jsx
import React from 'react';
import { Home, School, Package, ShoppingCart, Settings, X, Calendar, BarChart3, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';

const Sidebar = ({ onClose }) => {
  const router = useRouter();
  
  const navigationItems = [
    {
      name: 'Overview',
      href: '/dashboard-massibec',
      icon: Home,
      description: 'Vue d\'ensemble'
    },
    {
      name: 'Gestion des Écoles',
      href: '/dashboard-massibec/schools',
      icon: School,
      description: 'Écoles et directeurs'
    },
    {
      name: 'Gestion des Campagnes',
      href: '/dashboard-massibec/campaigns',
      icon: Calendar,
      description: 'Campagnes et objectifs'
    },
    {
      name: 'Gestion des Produits',
      href: '/dashboard-massibec/products',
      icon: Package,
      description: 'Catalogue produits'
    },
    {
      name: 'Gestion des Commandes',
      href: '/dashboard-massibec/orders',
      icon: ShoppingCart,
      description: 'Commandes et livraisons'
    },
    {
      name: 'Analytics',
      href: '/dashboard-massibec/analytics',
      icon: BarChart3,
      description: 'Rapports et statistiques'
    },
    {
      name: 'Paramètres',
      href: '/dashboard-massibec/settings',
      icon: Settings,
      description: 'Configuration'
    }
  ];

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-full flex flex-col shadow-xl">
      {/* Header with logo and close button */}
      <div className="p-6 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Massibec</h2>
            <p className="text-xs text-gray-400">Fournisseur Dashboard</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col p-4 space-y-1 flex-1">
        {navigationItems.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} passHref legacyBehavior>
              <a 
                className={`flex items-center p-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={onClose}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer with user info */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Fournisseur</div>
            <div className="text-xs text-gray-400">Massibec</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;