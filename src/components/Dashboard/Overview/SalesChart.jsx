// components/Dashboard/Overview/SalesChart.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  // ... more data
];

const SalesChart = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Sales Over Time</CardTitle>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sales" stroke="#6366F1" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SalesChart;