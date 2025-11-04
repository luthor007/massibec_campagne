import { useState, useEffect, useCallback } from 'react';

export const useSchoolData = (schoolIdOrUserId) => {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchoolData = useCallback(async (forceRefresh = false) => {
    // Always try to fetch, even if schoolIdOrUserId is undefined
    // The API will find the school from user's associations if no schoolId is provided
    // Only skip if explicitly set to empty string
    if (schoolIdOrUserId === '') return;

    try {
      setLoading(true);
      setError(null);

      // If it looks like an ObjectId (24 hex chars), treat it as schoolId
      // Otherwise, don't pass schoolId and let API find from user's associations
      const isSchoolId = schoolIdOrUserId && /^[0-9a-fA-F]{24}$/.test(schoolIdOrUserId);
      const queryParam = isSchoolId ? `schoolId=${schoolIdOrUserId}` : '';
      const timestampParam = forceRefresh ? `t=${Date.now()}` : '';
      const params = [queryParam, timestampParam].filter(Boolean).join('&');
      
      const url = params ? `/api/school-info?${params}` : '/api/school-info';
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        // If 403 and we were using a schoolId, clear it and retry without schoolId
        if (response.status === 403 && isSchoolId) {
          console.log('403 Forbidden - invalid schoolId, retrying without schoolId parameter');
          console.log('This means the schoolId in localStorage is invalid and should be cleared');
          
          // Retry without schoolId to let API find from user associations
          const retryUrl = forceRefresh ? `/api/school-info?t=${Date.now()}` : '/api/school-info';
          const retryResponse = await fetch(retryUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            setSchool(data);
            // Set a special error to indicate schoolId was invalid but we recovered
            // This will help parent components know to update their selectedSchoolId
            setError('INVALID_SCHOOL_ID_RECOVERED');
            return; // Success on retry
          } else {
            // Even retry failed, set proper error
            setError(`Failed to fetch school info: ${retryResponse.status}`);
            throw new Error(`Failed to fetch school info: ${retryResponse.status}`);
          }
        }
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
  }, [schoolIdOrUserId]);

  const refreshSchoolData = useCallback(() => {
    fetchSchoolData(true); // Force refresh with cache busting
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
