// components/Dashboard/Sidebar.jsx
import React from 'react';
import { Home, School, Package, ShoppingCart, Settings, X, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const Sidebar = ({ onClose }) => {
  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      {/* Header with close button for mobile */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Fournisseur Dashboard</h2>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col p-4 space-y-2 flex-1">
        <Link href="/dashboard-massibec" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded transition-colors" onClick={onClose}>
            <Home className="w-5 h-5 mr-2" />
            Overview
          </a>
        </Link>
        <Link href="/dashboard-massibec/schools" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded transition-colors" onClick={onClose}>
            <School className="w-5 h-5 mr-2" />
            School Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/campaigns" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded transition-colors" onClick={onClose}>
            <Calendar className="w-5 h-5 mr-2" />
            Campaign Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/products" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded transition-colors" onClick={onClose}>
            <Package className="w-5 h-5 mr-2" />
            Product Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/orders" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded transition-colors" onClick={onClose}>
            <ShoppingCart className="w-5 h-5 mr-2" />
            Order Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/settings" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded transition-colors" onClick={onClose}>
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </a>
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;