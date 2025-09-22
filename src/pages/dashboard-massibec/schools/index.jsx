// pages/dashboard-massibec/schools/index.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SchoolSelector from '../../../components/Dashboard/SchoolManagement/SchoolSelector';
import SchoolInfo from '../../../components/Dashboard/SchoolManagement/SchoolInfo';
import SchoolOrders from '../../../components/Dashboard/SchoolManagement/SchoolOrders';
import SchoolSalesData from '../../../components/Dashboard/SchoolManagement/SchoolSalesData';

const SchoolsPage = () => {
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [errorSchool, setErrorSchool] = useState(null);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchSchoolData(selectedSchoolId);
    }
  }, [selectedSchoolId]);

  const fetchSchoolData = async (schoolId) => {
    setLoadingSchool(true);
    setErrorSchool(null);
    try {
      const response = await fetch(`/api/schools/${schoolId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch school data.');
      }
      const data = await response.json();
      setSchoolData(data);
    } catch (error) {
      setErrorSchool(error.message);
    } finally {
      setLoadingSchool(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">School Management</h2>
        <SchoolSelector onSelectSchool={setSelectedSchoolId} />
      </div>

      {loadingSchool && <p>Loading school data...</p>}
      {errorSchool && <p className="text-red-500">Error: {errorSchool}</p>}

      {schoolData && (
        <div className="space-y-8">
          <SchoolInfo school={schoolData} />
          <SchoolOrders schoolId={selectedSchoolId} />
          <SchoolSalesData schoolId={selectedSchoolId} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default SchoolsPage;