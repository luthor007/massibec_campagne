import { useState, useEffect, useCallback } from 'react';

export const useCampaignStats = (campaignId) => {
  const [stats, setStats] = useState({
    totalRaised: 0,
    participantCount: 0,
    productsSold: 0,
    topSellers: [],
    goalProgress: 0,
    financialGoal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaignStats = useCallback(async () => {
    if (!campaignId) {
      setStats({
        totalRaised: 0,
        participantCount: 0,
        productsSold: 0,
        topSellers: [],
        goalProgress: 0,
        financialGoal: 0
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/campaigns/${campaignId}/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching campaign stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const refreshStats = useCallback(() => {
    fetchCampaignStats();
  }, [fetchCampaignStats]);

  useEffect(() => {
    fetchCampaignStats();
  }, [fetchCampaignStats]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
};
