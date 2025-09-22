// components/Dashboard/SchoolManagement/PendingSchools.jsx
import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// Import API functions
import {
  fetchPendingSchools,
  approveSchool,
  rejectSchool,
} from '@/utils/api'

const PendingSchools = () => {
  const [pendingSchools, setPendingSchools] = useState([]);

  useEffect(() => {
    // Fetch pending schools from API
    fetchPendingSchools().then(setPendingSchools);
  }, []);

  const approveSchool = (schoolId) => {
    // API call to approve school
    approveSchool(schoolId).then(() => {
      setPendingSchools(pendingSchools.filter((school) => school.id !== schoolId));
    });
  };

  const rejectSchool = (schoolId) => {
    // API call to reject school
    rejectSchool(schoolId).then(() => {
      setPendingSchools(pendingSchools.filter((school) => school.id !== schoolId));
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pending School Approvals</h2>
      <Table>
        <thead>
          <tr>
            <th>School Name</th>
            <th>Application Date</th>
            <th>Contact Person</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingSchools.map((school) => (
            <tr key={school.id}>
              <td>{school.name}</td>
              <td>{new Date(school.applicationDate).toLocaleDateString()}</td>
              <td>{school.contactPerson}</td>
              <td>
                <Button onClick={() => approveSchool(school.id)} variant="success" className="mr-2">Approve</Button>
                <Button onClick={() => rejectSchool(school.id)} variant="danger">Reject</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default PendingSchools;