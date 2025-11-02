import { useState, useEffect, useCallback } from 'react';

export const useSchoolCampaigns = (schoolId) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/campaigns?schoolId=${schoolId}`, {
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
      setCampaigns(data);
    } catch (err) {
      console.error('Erreur lors de la récupération des campagnes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const approveCampaign = useCallback(async (campaignId) => {
    try {
      setActionInProgress(true);
      
      const response = await fetch(`/api/campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      await fetchCampaigns(); // Refresh campaigns
      return true;
    } catch (err) {
      console.error('Erreur lors de l\'approbation de la campagne:', err);
      throw err;
    } finally {
      setActionInProgress(false);
    }
  }, [fetchCampaigns]);

  const rejectCampaign = useCallback(async (campaignId, reason) => {
    try {
      setActionInProgress(true);
      
      const response = await fetch(`/api/campaigns/${campaignId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      await fetchCampaigns(); // Refresh campaigns
      return true;
    } catch (err) {
      console.error('Erreur lors du rejet de la campagne:', err);
      throw err;
    } finally {
      setActionInProgress(false);
    }
  }, [fetchCampaigns]);

  const modifyCampaign = useCallback(async (campaignId, modifications) => {
    try {
      setActionInProgress(true);
      
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifications),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      await fetchCampaigns(); // Refresh campaigns
      return true;
    } catch (err) {
      console.error('Erreur lors de la modification de la campagne:', err);
      throw err;
    } finally {
      setActionInProgress(false);
    }
  }, [fetchCampaigns]);

  const lockCampaign = useCallback(async (campaignId, locked = true) => {
    try {
      setActionInProgress(true);
      
      const response = await fetch(`/api/campaigns/${campaignId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locked }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      await fetchCampaigns(); // Refresh campaigns
      return true;
    } catch (err) {
      console.error('Erreur lors du verrouillage de la campagne:', err);
      throw err;
    } finally {
      setActionInProgress(false);
    }
  }, [fetchCampaigns]);

  const getCampaignById = useCallback((campaignId) => {
    return campaigns.find(campaign => campaign._id === campaignId);
  }, [campaigns]);

  const getActiveCampaigns = useCallback(() => {
    return campaigns.filter(campaign => campaign.status === 'active');
  }, [campaigns]);

  const getPendingCampaigns = useCallback(() => {
    return campaigns.filter(campaign => campaign.status === 'pending');
  }, [campaigns]);

  const getCompletedCampaigns = useCallback(() => {
    return campaigns.filter(campaign => campaign.status === 'completed');
  }, [campaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    actionInProgress,
    refreshCampaigns: fetchCampaigns,
    approveCampaign,
    rejectCampaign,
    modifyCampaign,
    lockCampaign,
    getCampaignById,
    getActiveCampaigns,
    getPendingCampaigns,
    getCompletedCampaigns
  };
};