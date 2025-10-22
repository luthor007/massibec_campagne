import { useState, useEffect, useCallback } from 'react';

export const useSchoolData = (userId) => {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchoolData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/school-info');
      if (!response.ok) {
        throw new Error(`Failed to fetch school info: ${response.status}`);
      }

      const data = await response.json();
      setSchool(data);
    } catch (err) {
      console.error('Error fetching school data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshSchoolData = useCallback(() => {
    fetchSchoolData();
  }, [fetchSchoolData]);

  useEffect(() => {
    fetchSchoolData();
  }, [fetchSchoolData]);

  return {
    school,
    loading,
    error,
    refreshSchoolData
  };
};
