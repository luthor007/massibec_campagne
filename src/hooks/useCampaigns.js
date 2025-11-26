import { useState, useEffect, useCallback } from 'react';

export const useCampaigns = (userId) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/campaigns', {
        cache: 'no-store',
        credentials: 'include', // Ensure cookies are sent with the request
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshCampaigns = useCallback(async () => {
    return await fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    refreshCampaigns
  };
};
