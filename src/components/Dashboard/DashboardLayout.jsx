// components/Dashboard/DashboardLayout.jsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from './Sidebar';
import Header from './Header';
import { useBlockNavigation } from '../../hooks/useBlockNavigation';

const DashboardLayout = ({ children, blockSidebar = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const currentRoute = router.pathname;

  // Determine allowed routes based on current onboarding step
  const allowedRoutes = ['/dashboard-supplier/products', '/dashboard-supplier/settings'];
  const { blockSidebar: shouldBlockSidebar } = useBlockNavigation(allowedRoutes);

  const finalBlockSidebar = blockSidebar || shouldBlockSidebar;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 h-screen' : 'hidden'} lg:block lg:relative lg:z-auto ${finalBlockSidebar ? 'pointer-events-none opacity-50' : ''} lg:h-full`}>
        <Sidebar onClose={() => setSidebarOpen(false)} currentRoute={currentRoute} allowedRoutes={allowedRoutes} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-2 sm:p-3 md:p-4 lg:p-6 pb-safe">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;