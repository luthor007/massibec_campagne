// components/Dashboard/OrderManagement/OrderList.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button } from '@shadcn/ui';

const OrderList = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Fetch orders from API
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Orders</h2>
      <Table>
        <thead>
          <tr>
            <th>Horodatage</th>
            <th>Student Name</th>
            <th>School Name</th>
            <th>Order Total</th>
            <th>Payment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{new Date(order.timestamp).toLocaleString()}</td>
              <td>{order.studentName}</td>
              <td>{order.schoolName}</td>
              <td>${order.totalAmount.toFixed(2)}</td>
              <td>{order.paymentStatus}</td>
              <td>
                <Button variant="primary" className="mr-2">View</Button>
                <Button variant="secondary">Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Button variant="success" className="mt-4">Export to CSV</Button>
    </div>
  );
};

export default OrderList;