// components/Dashboard/ProfitAllocation/ProfitSettings.jsx
import React, { useState } from 'react';
import { Form, Input, Button } from '@shadcn/ui';

const ProfitSettings = () => {
  const [settings, setSettings] = useState({
    studentProfit: 3.00,
    raffleProfitPerUnit: 0.18,
  });

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSubmit = () => {
    // Save settings via API
  };

  const orgProfit = (price, cost) => {
    return price - cost - settings.studentProfit - settings.raffleProfitPerUnit;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Profit Allocation Settings</h2>
      <Form onSubmit={handleSubmit}>
        <Input
          label="Student Profit per Unit"
          name="studentProfit"
          type="number"
          value={settings.studentProfit}
          onChange={handleChange}
          required
        />
        <Input
          label="Raffle Profit per Unit"
          name="raffleProfitPerUnit"
          type="number"
          value={settings.raffleProfitPerUnit}
          onChange={handleChange}
          required
        />
        <Button type="submit" variant="primary">Save Settings</Button>
      </Form>
      {/* Visualization */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Profit Distribution Example</h3>
        <p>Organization Profit: ${orgProfit(10.00, 6.50).toFixed(2)} (Based on a product sold at $10.00 with a cost of $6.50)</p>
      </div>
    </div>
  );
};

export default ProfitSettings;