// components/Dashboard/Overview/TopSchools.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'School A', sales: 50000 },
  { name: 'School B', sales: 40000 },
  // ... more data
];

const TopSchools = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Top Performing Schools</CardTitle>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="#34D399" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TopSchools;