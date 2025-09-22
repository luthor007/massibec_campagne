// components/Dashboard/BonusManagement/BonusTable.jsx
import React, { useState } from 'react';
import { Table, Button, Input } from '@shadcn/ui';

const BonusTable = () => {
  const [bonusTable, setBonusTable] = useState([
    { min: 200, max: 499, bonus: 0.30, totalMin: 60.00, totalMax: 149.70 },
    // ... other tiers
  ]);

  const handleChange = (index, field, value) => {
    const updatedTable = [...bonusTable];
    updatedTable[index][field] = value;
    setBonusTable(updatedTable);
  };

  const addTier = () => {
    setBonusTable([...bonusTable, { min: 0, max: 0, bonus: 0, totalMin: 0, totalMax: 0 }]);
  };

  const saveBonusTable = () => {
    // Save bonus table via API
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Bonus Structure</h2>
      <Table>
        <thead>
          <tr>
            <th>Min Units</th>
            <th>Max Units</th>
            <th>Bonus per Unit</th>
            <th>Total Min</th>
            <th>Total Max</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bonusTable.map((tier, index) => (
            <tr key={index}>
              <td>
                <Input
                  type="number"
                  value={tier.min}
                  onChange={(e) => handleChange(index, 'min', parseInt(e.target.value))}
                />
              </td>
              <td>
                <Input
                  type="number"
                  value={tier.max}
                  onChange={(e) => handleChange(index, 'max', parseInt(e.target.value))}
                />
              </td>
              <td>
                <Input
                  type="number"
                  value={tier.bonus}
                  onChange={(e) => handleChange(index, 'bonus', parseFloat(e.target.value))}
                />
              </td>
              <td>${tier.totalMin.toFixed(2)}</td>
              <td>${tier.totalMax.toFixed(2)}</td>
              <td>
                <Button variant="danger" onClick={() => {
                  const updatedTable = bonusTable.filter((_, i) => i !== index);
                  setBonusTable(updatedTable);
                }}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Button variant="success" className="mt-4 mr-2" onClick={addTier}>Add Tier</Button>
      <Button variant="primary" className="mt-4" onClick={saveBonusTable}>Save Changes</Button>
    </div>
  );
};

export default BonusTable;