// pages/dashboard-massibec/products/index.jsx
import React from 'react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import ProductList from '../../../components/Dashboard/ProductManagement/ProductList';
import ProductForm from '../../../components/Dashboard/ProductManagement/ProductForm';

const ProductsPage = () => {
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-4">Product Management</h2>
      <ProductForm />
      <ProductList />
    </DashboardLayout>
  );
};

export default ProductsPage;