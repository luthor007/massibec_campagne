// pages/dashboard/index.jsx
import React from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import OverviewCards from '../../components/Dashboard/Overview/OverviewCards';
import Overview from '../../components/Dashboard/Overview/Overview';
import SalesChart from '../../components/Dashboard/Overview/SalesChart';
import TopSchools from '../../components/Dashboard/Overview/TopSchools';

const DashboardMassibec = () => {
  return (
    <DashboardLayout>
      <Overview />
    </DashboardLayout>
  );
};

export default DashboardMassibec;