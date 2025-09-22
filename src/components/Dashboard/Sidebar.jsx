// components/Dashboard/Sidebar.jsx
import React from 'react';
import { Home, School, Package, ShoppingCart, Settings } from 'lucide-react';
import Link from 'next/link'; // Correct import for Next.js Link

const Sidebar = () => {
  return (
    <div className="w-64 bg-white border-r h-full">
      <div className="p-4">
        <h2 className="text-xl font-bold">Fournisseur Dashboard</h2>
      </div>
      <nav className="flex flex-col p-4 space-y-2">
        <Link href="/dashboard-massibec" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded">
            <Home className="w-5 h-5 mr-2" />
            Overview
          </a>
        </Link>
        <Link href="/dashboard-massibec/schools" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded">
            <School className="w-5 h-5 mr-2" />
            School Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/products" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded">
            <Package className="w-5 h-5 mr-2" />
            Product Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/orders" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Order Management
          </a>
        </Link>
        <Link href="/dashboard-massibec/settings" passHref legacyBehavior>
          <a className="flex items-center p-2 hover:bg-gray-200 rounded">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </a>
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;