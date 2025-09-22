// components/Dashboard/ProductManagement/ProductList.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button } from '@shadcn/ui';

const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Fetch products from API
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Product Catalog</h2>
        <Button variant="primary">Add New Product</Button>
      </div>
      <Table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Cost Price</th>
            <th>Selling Price</th>
            <th>Profit Per Unit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const profitPerUnit = product.price - product.cost;
            return (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>${product.cost.toFixed(2)}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>${profitPerUnit.toFixed(2)}</td>
                <td>
                  <Button variant="secondary" className="mr-2">Edit</Button>
                  <Button variant="danger">Delete</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default ProductList;