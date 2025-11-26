// pages/dashboard-massibec/settings/index.jsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import Settings from '../../../components/Dashboard/Settings/Settings';

const SettingsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/connexion');
      return;
    }
    // Redirect suppliers to the new dashboard-supplier pages
    if (session.user.role === 'supplier' || session.user.role === 'fournisseur') {
      router.push('/dashboard-supplier/settings');
      return;
    }
  }, [session, status, router]);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <Settings />
    </DashboardLayout>
  );
};

export default SettingsPage;