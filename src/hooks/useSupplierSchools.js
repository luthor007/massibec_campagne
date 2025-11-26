import { useState, useEffect, useCallback } from 'react';

export const useSupplierSchools = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/supplier/schools', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSchools(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur lors de la récupération des écoles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSchools = useCallback(() => {
    fetchSchools();
  }, [fetchSchools]);

  const filterByStatus = useCallback((status) => {
    if (!status || !Array.isArray(schools)) return schools || [];
    return schools.filter(school => school.status === status);
  }, [schools]);

  const getSchoolsNeedingApproval = useCallback(() => {
    return Array.isArray(schools) ? schools.filter(school => school.status === 'pending') : [];
  }, [schools]);

  const getActiveSchools = useCallback(() => {
    return Array.isArray(schools) ? schools.filter(school => school.status === 'approved') : [];
  }, [schools]);

  const getSchoolsWithActiveCampaigns = useCallback(() => {
    return Array.isArray(schools) ? schools.filter(school => school.activeCampaign && school.activeCampaign.status === 'active') : [];
  }, [schools]);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    fetchSchools();

    const interval = setInterval(() => {
      fetchSchools();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchSchools]);

  return {
    schools,
    loading,
    error,
    refreshSchools,
    filterByStatus,
    getSchoolsNeedingApproval,
    getActiveSchools,
    getSchoolsWithActiveCampaigns
  };
};