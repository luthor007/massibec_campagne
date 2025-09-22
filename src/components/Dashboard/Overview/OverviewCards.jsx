// components/Dashboard/Overview/OverviewCards.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OverviewCards = () => {
  const metrics = [
    { title: 'Total Sales', value: '$150,000' },
    { title: 'Active Schools', value: '25' },
    { title: 'Pending Approvals', value: '5' },
    { title: 'Total Orders', value: '3,200' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{metric.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OverviewCards;