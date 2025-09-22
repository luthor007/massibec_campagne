// pages/dashboard-massibec/settings/index.jsx
import React from 'react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import Settings from '../../../components/Dashboard/Settings/Settings';

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <Settings />
    </DashboardLayout>
  );
};

export default SettingsPage;