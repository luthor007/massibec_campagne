import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const useOnboarding = () => {
  const { data: session } = useSession();
  const [progress, setProgress] = useState({});
  const [currentStep, setCurrentStep] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const steps = [
    { key: 'joinedCampaign', title: 'Rejoindre une campagne', order: 1 },
    { key: 'personalizedStore', title: 'Personnaliser la boutique', order: 2 },
    { key: 'visitedStore', title: 'Visiter la boutique', order: 3 },
    { key: 'viewedOrders', title: 'Consulter les commandes', order: 4 },
    { key: 'viewedStats', title: 'Analyser les statistiques', order: 5 },
    { key: 'viewedTools', title: 'Utiliser les outils de vente', order: 6 }
  ];

  const fetchProgress = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/onboarding/progress');
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        setIsCompleted(data.isCompleted);
        setCompletionPercentage(data.completionPercentage);
        
        // Déterminer la prochaine étape
        const nextStep = getNextStep(data.progress);
        setCurrentStep(nextStep);
        
        console.log('Onboarding progress loaded:', data.progress);
        console.log('Current step:', nextStep);
        console.log('Is completed:', data.isCompleted);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const markStepComplete = useCallback(async (stepKey, completed = true) => {
    if (!session?.user) return false;

    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepKey, completed })
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        setIsCompleted(data.isCompleted);
        setCompletionPercentage(data.completionPercentage);
        
        // Mettre à jour la prochaine étape
        const nextStep = getNextStep(data.progress);
        setCurrentStep(nextStep);
        
        return true;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error);
    }
    
    return false;
  }, [session]);

  const getNextStep = useCallback((currentProgress = progress) => {
    for (const step of steps) {
      if (!currentProgress[step.key]) {
        return step;
      }
    }
    return null; // Toutes les étapes sont complétées
  }, [progress]);

  const getStepByKey = useCallback((stepKey) => {
    return steps.find(step => step.key === stepKey);
  }, []);

  const getStepContent = useCallback((stepKey) => {
    const stepContents = {
      joinedCampaign: {
        title: "Rejoindre une campagne",
        message: "Cliquez 'Rejoindre' et collez le code de votre école.",
        tip: null,
        stats: null,
        benefit: null
      },
      personalizedStore: {
        title: "Personnaliser votre boutique",
        message: "Configurez le nom et la description de votre boutique.",
        tip: null,
        stats: null,
        benefit: null
      },
            visitedStore: {
              title: "Commande de test",
              message: "Ajoutez un produit à votre panier pour tester votre boutique. C'est gratuit !",
              tip: "💡 Cliquez sur 'Ajouter au panier' pour commencer votre commande de test.",
              stats: null,
              benefit: null
            },
      viewedOrders: {
        title: "Voir vos commandes",
        message: "Consultez les commandes de vos clients ici.",
        tip: null,
        stats: null,
        benefit: null
      },
      viewedStats: {
        title: "Voir vos statistiques",
        message: "Consultez vos ventes et performances ici.",
        tip: null,
        stats: null,
        benefit: null
      },
      viewedTools: {
        title: "Outils de vente",
        message: "Accédez aux outils marketing pour booster vos ventes.",
        tip: null,
        stats: null,
        benefit: null
      }
    };

    return stepContents[stepKey] || {};
  }, []);

  const skipStep = useCallback(async (stepKey) => {
    return await markStepComplete(stepKey, true);
  }, [markStepComplete]);

  const resetOnboarding = useCallback(async () => {
    if (!session?.user) return false;

    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          step: 'reset', 
          completed: false 
        })
      });

      if (response.ok) {
        await fetchProgress();
        return true;
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    }
    
    return false;
  }, [session, fetchProgress]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    currentStep,
    isLoading,
    isCompleted,
    completionPercentage,
    steps,
    markStepComplete,
    skipStep,
    getNextStep,
    getStepByKey,
    getStepContent,
    resetOnboarding,
    fetchProgress
  };
};

export default useOnboarding;
