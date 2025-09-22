'use client';

import React, { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const SchoolSelector = ({ onSelectSchool }) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch('/api/schools');
        if (!response.ok) {
          throw new Error('Failed to fetch schools.');
        }
        const data = await response.json();
        setSchools(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const handleChange = (value) => {
    onSelectSchool(value);
  };

  return (
    <div>
      <Label htmlFor="school-selector" className="sr-only">Select School</Label>
      {loading ? (
        <p>Loading schools...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <Select onValueChange={handleChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a school" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school._id} value={school._id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default SchoolSelector; 