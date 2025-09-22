'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react'; // Import icons
import { Checkbox } from '@/components/ui/checkbox';

const SchoolInfo = ({ school }) => {
  const [formData, setFormData] = useState({
    name: school.name || '',
    address: school.address || '',
    objectifFinancier: school.objectifFinancier || '',
    debutCampagne: school.debutCampagne ? new Date(school.debutCampagne).toISOString().split('T')[0] : '',
    finCampagne: school.finCampagne ? new Date(school.finCampagne).toISOString().split('T')[0] : '',
    dateDeLivraison: school.dateDeLivraison ? new Date(school.dateDeLivraison).toISOString().split('T')[0] : '',
    telephone: school.telephone || '',
    email: school.email || '',
    accumba: school.accumba || '',
    expNum: school.expNum || '',
    split: school.split || { studentBenefit: 85.6, organizationBenefit: 9.4, raffleBenefit: 5.0 },
    isBonus: school.isBonus || false,
    customFields: school.customFields || {},
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name in formData.split) {
      setFormData({
        ...formData,
        split: {
          ...formData.split,
          [name]: Number(value),
        },
      });
    } else if (name.startsWith('custom_')) {
      const fieldName = name.replace('custom_', '');
      setFormData({
        ...formData,
        customFields: {
          ...formData.customFields,
          [fieldName]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    
    setFormData({
      ...formData,
      customFields: {
        ...formData.customFields,
        [newFieldName]: '',
      },
    });
    setNewFieldName('');
  };

  const removeCustomField = (fieldName) => {
    const newCustomFields = { ...formData.customFields };
    delete newCustomFields[fieldName];
    setFormData({
      ...formData,
      customFields: newCustomFields,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/schools/${school._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update school information.');
      }

      const updatedSchool = await response.json();
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'School information updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">School Information</h3>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div>
              <Label htmlFor="name">School Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* Campaign Information */}
            <div>
              <Label htmlFor="objectifFinancier">Financial Objective</Label>
              <Input
                id="objectifFinancier"
                name="objectifFinancier"
                value={formData.objectifFinancier}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="debutCampagne">Campaign Start</Label>
              <Input
                id="debutCampagne"
                name="debutCampagne"
                type="date"
                value={formData.debutCampagne}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="finCampagne">Campaign End</Label>
              <Input
                id="finCampagne"
                name="finCampagne"
                type="date"
                value={formData.finCampagne}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="dateDeLivraison">Delivery Date</Label>
              <Input
                id="dateDeLivraison"
                name="dateDeLivraison"
                type="date"
                value={formData.dateDeLivraison}
                onChange={handleChange}
                required
              />
            </div>

            {/* EDI Information */}
            <div>
              <Label htmlFor="accumba">Accumba Number</Label>
              <Input
                id="accumba"
                name="accumba"
                value={formData.accumba}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="expNum">Exp Number</Label>
              <Input
                id="expNum"
                name="expNum"
                value={formData.expNum}
                onChange={handleChange}
              />
            </div>

            {/* Bonus Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isBonus"
                checked={formData.isBonus}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isBonus: checked })
                }
              />
              <Label htmlFor="isBonus">Enable Bonus System</Label>
            </div>
          </div>

          {/* Split Configuration */}
          <div>
            <h4 className="font-semibold">Split Configuration (%)</h4>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <Label htmlFor="studentBenefit">Student Benefit</Label>
                <Input
                  id="studentBenefit"
                  name="studentBenefit"
                  type="number"
                  value={formData.split.studentBenefit}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="organizationBenefit">Organization Benefit</Label>
                <Input
                  id="organizationBenefit"
                  name="organizationBenefit"
                  type="number"
                  value={formData.split.organizationBenefit}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="raffleBenefit">Raffle Benefit</Label>
                <Input
                  id="raffleBenefit"
                  name="raffleBenefit"
                  type="number"
                  value={formData.split.raffleBenefit}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>
          </div>

          {/* Custom Fields Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Custom Fields</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="New field name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-48"
                />
                <Button
                  type="button"
                  onClick={addCustomField}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(formData.customFields).map(([fieldName, value]) => (
                <div key={fieldName} className="flex gap-2">
                  <div className="flex-grow">
                    <Label htmlFor={`custom_${fieldName}`}>{fieldName}</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`custom_${fieldName}`}
                        name={`custom_${fieldName}`}
                        value={value}
                        onChange={handleChange}
                      />
                      <Button
                        type="button"
                        onClick={() => removeCustomField(fieldName)}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit">Save Changes</Button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Basic Information</h4>
              <p><strong>Name:</strong> {school.name}</p>
              <p><strong>Email:</strong> {school.email}</p>
              <p><strong>Telephone:</strong> {school.telephone}</p>
              <p><strong>Address:</strong> {school.address}</p>
            </div>

            {/* Campaign Information */}
            <div>
              <h4 className="font-semibold">Campaign Details</h4>
              <p><strong>Financial Objective:</strong> {school.objectifFinancier}</p>
              <p><strong>Campaign Start:</strong> {new Date(school.debutCampagne).toLocaleDateString()}</p>
              <p><strong>Campaign End:</strong> {new Date(school.finCampagne).toLocaleDateString()}</p>
              <p><strong>Delivery Date:</strong> {new Date(school.dateDeLivraison).toLocaleDateString()}</p>
            </div>

            {/* EDI Information */}
            <div>
              <h4 className="font-semibold">EDI Information</h4>
              <p><strong>Accumba Number:</strong> {school.accumba || 'Not set'}</p>
              <p><strong>Exp Number:</strong> {school.expNum || 'Not set'}</p>
              <p><strong>Bonus System:</strong> {school.isBonus ? 'Enabled' : 'Disabled'}</p>
            </div>

            {/* Split Configuration */}
            <div>
              <h4 className="font-semibold">Split Configuration (%)</h4>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="studentBenefit">Student Benefit</Label>
                  <Input
                    id="studentBenefit"
                    name="studentBenefit"
                    type="number"
                    value={school.split.studentBenefit}
                    disabled
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="organizationBenefit">Organization Benefit</Label>
                  <Input
                    id="organizationBenefit"
                    name="organizationBenefit"
                    type="number"
                    value={school.split.organizationBenefit}
                    disabled
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="raffleBenefit">Raffle Benefit</Label>
                  <Input
                    id="raffleBenefit"
                    name="raffleBenefit"
                    type="number"
                    value={school.split.raffleBenefit}
                    disabled
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Display Custom Fields */}
            {Object.keys(school.customFields || {}).length > 0 && (
              <div>
                <strong>Custom Fields:</strong>
                <ul className="list-disc list-inside">
                  {Object.entries(school.customFields).map(([key, value]) => (
                    <li key={key}>
                      {key}: {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolInfo; 