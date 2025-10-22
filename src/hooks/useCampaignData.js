import { useState, useEffect, useCallback } from 'react';

export const useCampaignData = (schoolId) => {
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    if (!schoolId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/school-info');
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }

      const schoolData = await response.json();
      const campaignsList = schoolData.campaigns || [];
      
      setCampaigns(campaignsList);
      
      // Set active campaign (first active one, or first one if none active)
      const active = campaignsList.find(c => c.isActive) || campaignsList[0];
      setActiveCampaign(active);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const selectCampaign = useCallback((campaignId) => {
    const campaign = campaigns.find(c => c._id === campaignId);
    if (campaign) {
      setActiveCampaign(campaign);
    }
  }, [campaigns]);

  const refreshCampaigns = useCallback(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    activeCampaign,
    loading,
    error,
    selectCampaign,
    refreshCampaigns
  };
};
