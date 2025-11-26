import { useState, useEffect, useCallback } from 'react';

export const useSupplierCampaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCampaigns = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/supplier/campaigns', {
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
            setCampaigns(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erreur lors de la récupération des campagnes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshCampaigns = useCallback(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        fetchCampaigns();

        const interval = setInterval(() => {
            fetchCampaigns();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchCampaigns]);

    return {
        campaigns,
        loading,
        error,
        refreshCampaigns
    };
};


