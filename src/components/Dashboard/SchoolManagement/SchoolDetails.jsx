// components/Dashboard/SchoolManagement/SchoolDetails.jsx
import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from '@shadcn/ui';

const SchoolDetails = ({ schoolId }) => {
  const [school, setSchool] = useState(null);

  useEffect(() => {
    // Fetch school details from API
    fetch(`/api/schools/${schoolId}`)
      .then((res) => res.json())
      .then((data) => setSchool(data));
  }, [schoolId]);

  if (!school) return <p>Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{school.name}</h2>
      <Tabs>
        <Tab title="Overview">
          {/* Overview content */}
        </Tab>
        <Tab title="Participants">
          {/* Participants list */}
        </Tab>
        <Tab title="Orders">
          {/* Orders list */}
        </Tab>
        <Tab title="Settings">
          {/* Settings form */}
        </Tab>
      </Tabs>
    </div>
  );
};

export default SchoolDetails;