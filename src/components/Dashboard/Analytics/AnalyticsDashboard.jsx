// components/Dashboard/Analytics/AnalyticsDashboard.jsx
import React from 'react';
import { Card, CardHeader, CardTitle } from '@shadcn/ui';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const salesData = [
  // ... data for sales over time
];

const profitData = [
  // ... data for profit breakdown
];

const AnalyticsDashboard = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#6366F1" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profit Breakdown</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#34D399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      {/* Additional charts and tables as needed */}
    </div>
  );
};

export default AnalyticsDashboard;