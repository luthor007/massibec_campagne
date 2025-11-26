// components/Dashboard/Header.jsx
import React, { useState, useEffect } from 'react';
import { Bell, Menu, ChevronDown, User, LogOut, Settings, Building2, ShoppingBag, School, Package, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import ChatModal from './Messaging/ChatModal';
import { useSchoolData } from '../../hooks/useSchoolData';

const Header = ({ onMenuClick }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const isSupplier = session?.user?.role === 'supplier';
  const isSchoolManager = session?.user?.role === 'school_manager';
  const isSupplierDashboard = router.pathname.startsWith('/dashboard-supplier');

  // Get school data for school managers (only if school manager)
  const schoolIdParam = isSchoolManager ? undefined : null; // undefined will fetch from user associations
  const { school } = useSchoolData(schoolIdParam);

  const [notifications, setNotifications] = useState([]);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSwitchToSchoolPortal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('viewMode', 'school_preview');
      localStorage.setItem('supplierView', 'true');
    }
    router.push('/dashboard-manager');
  };

  const handleSwitchToSellerPortal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('viewMode', 'student_preview');
      localStorage.setItem('supplierView', 'true');
    }
    router.push('/dashboard');
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 gap-2 sm:gap-3">
        {/* Left side - Menu button */}
        <div className="flex items-center flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden flex-shrink-0"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - Portal buttons (for suppliers), Notifications and user menu */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-shrink-0">
          {/* Portal Navigation Buttons - Always visible for suppliers */}
          {isSupplier && isSupplierDashboard && (
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-wrap">
              {/* Portail Fournisseur - Current Badge (Active) */}
              <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 bg-blue-50 border-2 border-blue-500 rounded-lg shadow-sm flex-shrink-0">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-700 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-blue-700 whitespace-nowrap hidden xs:inline">Fournisseur</span>
                <span className="text-xs sm:text-sm font-semibold text-blue-700 whitespace-nowrap hidden lg:inline">Portail Fournisseur</span>
              </div>

              {/* Switch to School Portal Button */}
              <Button
                onClick={handleSwitchToSchoolPortal}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 h-auto flex-shrink-0"
              >
                <School className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap hidden xs:inline sm:inline md:hidden ml-1">Organisation</span>
                <span className="text-xs sm:text-sm whitespace-nowrap hidden md:inline lg:hidden ml-1.5">Organisation</span>
                <span className="text-xs sm:text-sm whitespace-nowrap hidden lg:inline ml-2">Portail Organisation</span>
              </Button>

              {/* Switch to Seller Portal Button */}
              <Button
                onClick={handleSwitchToSellerPortal}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 h-auto flex-shrink-0"
              >
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap hidden xs:inline sm:inline md:hidden ml-1">Vendeur</span>
                <span className="text-xs sm:text-sm whitespace-nowrap hidden md:inline lg:hidden ml-1.5">Vendeur</span>
                <span className="text-xs sm:text-sm whitespace-nowrap hidden lg:inline ml-2">Portail Vendeur</span>
              </Button>
            </div>
          )}

          {/* Portal Navigation for School Managers (existing) */}
          {isSchoolManager && !isSupplierDashboard && (
            <div className="hidden lg:flex items-center gap-2 flex-wrap">
              {/* Portail Organisation - Current Badge (Active) */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border-2 border-green-500 rounded-lg shadow-sm flex-shrink-0">
                <School className="h-4 w-4 text-green-700 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-700 whitespace-nowrap">Portail Organisation</span>
              </div>
              {/* Portail Vendeur */}
              <Button
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                asChild
              >
                <Link href="/dashboard">
                  <ShoppingBag className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="whitespace-nowrap">Portail Vendeur</span>
                </Link>
              </Button>
            </div>
          )}

          {/* Chat Button */}
          {(isSupplier || isSchoolManager) && (
            <Button
              variant="ghost"
              size="sm"
              className="relative flex-shrink-0"
              onClick={() => setShowChatModal(true)}
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative flex-shrink-0">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 shadow-lg rounded-lg">
              <div className="p-3 border-b border-gray-200 bg-white">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">{notifications.length} nouvelles notifications</p>
              </div>
              <div className="max-h-96 overflow-y-auto bg-white">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="p-3 hover:bg-gray-50 bg-white border-0 cursor-pointer"
                      onClick={() => {
                        if (notification.link) {
                          router.push(notification.link);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{notification.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {notification.timestamp
                            ? new Date(notification.timestamp).toLocaleString('fr-CA', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : ''}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem className="text-center text-blue-600 hover:bg-blue-50 bg-white">
                Voir toutes les notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className="hidden xl:block text-left min-w-0">
                  <div className="text-sm font-medium truncate">Fournisseur Jappuie.ca</div>
                  <div className="text-xs text-gray-500 truncate">Administrateur</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 hidden sm:block flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg rounded-lg">
              <DropdownMenuItem className="flex items-center space-x-2 bg-white hover:bg-gray-50">
                <User className="h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center space-x-2 bg-white hover:bg-gray-50">
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem className="flex items-center space-x-2 text-red-600 bg-white hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Chat Modal */}
      {(isSupplier || isSchoolManager) && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          schoolId={isSchoolManager ? (school?._id || school?.id) : null}
          supplierId={null}
          userRole={session?.user?.role}
        />
      )}
    </header>
  );
};

export default Header;