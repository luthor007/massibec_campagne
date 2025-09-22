// components/Dashboard/Header.jsx
import React from 'react';
import { Bell } from 'lucide-react';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="flex items-center space-x-4">
        <button className="relative">
          <Bell className="w-6 h-6" />
          {/* Notification Badge */}
          <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 bg-red-600 text-white text-xs rounded-full">
            3
          </span>
        </button>
        <div className="flex items-center space-x-2">
          <img
            src="/path-to-profile-picture.jpg"
            alt="Profile"
            className="w-8 h-8 rounded-full"
          />
          <span>Username</span>
        </div>
      </div>
    </header>
  );
};

export default Header;