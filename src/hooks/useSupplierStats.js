import { useState, useEffect, useCallback } from 'react';

export const useSupplierStats = (periode = 'mois') => {
  const [stats, setStats] = useState({
    totalVentes: 0,
    nombreCommandes: 0,
    ecolesActives: 0,
    revenus: 0,
    topEcoles: [],
    topProduits: [],
    campagnesParStatut: {},
    tendances: [],
    alertes: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/supplier/stats?periode=${periode}`, {
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
      setStats(data);
    } catch (err) {
      console.error('Erreur lors de la récupération des statistiques:', err);
      setError(err.message);
      
      // Fallback avec données mockées si l'API n'existe pas encore
      setStats({
        totalVentes: 0,
        nombreCommandes: 0,
        ecolesActives: 0,
        revenus: 0,
        topEcoles: [],
        topProduits: [],
        campagnesParStatut: {},
        tendances: [],
        alertes: []
      });
    } finally {
      setLoading(false);
    }
  }, [periode]);

  const refreshStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  const getKPI = useCallback((kpiName) => {
    return stats[kpiName] || 0;
  }, [stats]);

  const getTopEcoles = useCallback((limit = 10) => {
    return stats.topEcoles.slice(0, limit);
  }, [stats.topEcoles]);

  const getTopProduits = useCallback((limit = 10) => {
    return stats.topProduits.slice(0, limit);
  }, [stats.topProduits]);

  const getAlertes = useCallback(() => {
    return stats.alertes || [];
  }, [stats.alertes]);

  const getTendances = useCallback(() => {
    return stats.tendances || [];
  }, [stats.tendances]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    getKPI,
    getTopEcoles,
    getTopProduits,
    getAlertes,
    getTendances
  };
};