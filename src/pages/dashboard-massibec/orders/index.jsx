// pages/dashboard-massibec/orders/index.jsx
import React from 'react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import OrderList from '../../../components/Dashboard/OrderManagement/OrderList';

const OrdersPage = () => {
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-4">Order Management</h2>
      <OrderList />
    </DashboardLayout>
  );
};

export default OrdersPage;