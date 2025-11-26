import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const useSupplierOnboarding = () => {
    const { data: session } = useSession();
    const [progress, setProgress] = useState({});
    const [currentStep, setCurrentStep] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompleted, setIsCompleted] = useState(false);
    const [completionPercentage, setCompletionPercentage] = useState(0);

    const steps = [
        {
            key: 'productCatalog',
            title: 'Créer votre catalogue de produits et configurer vos prix',
            order: 1,
            route: '/dashboard-supplier/products',
            description: 'Ajoutez vos produits avec leurs prix pickup à l\'usine. Le prix de vente à l\'école sera calculé automatiquement (+20%).'
        },
        {
            key: 'settings',
            title: 'Configurer votre équipe et vos paiements',
            order: 2,
            route: '/dashboard-supplier/settings',
            description: 'Ajoutez des membres à votre équipe et uploadez votre spécimen de chèque pour recevoir vos paiements'
        }
    ];

    const fetchProgress = useCallback(async () => {
        if (!session?.user || (session.user.role !== 'supplier' && session.user.role !== 'fournisseur')) return;

        try {
            const response = await fetch('/api/onboarding/progress?type=supplier');
            if (response.ok) {
                const data = await response.json();
                setProgress(data.progress || {});
                setIsCompleted(data.isCompleted || false);
                setCompletionPercentage(data.completionPercentage || 0);

                // Déterminer la prochaine étape
                const nextStep = getNextStep(data.progress || {});
                setCurrentStep(nextStep);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de la progression:', error);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    const getNextStep = useCallback((currentProgress = progress) => {
        for (const step of steps) {
            if (!currentProgress[step.key]) {
                return step;
            }
        }
        return null; // Toutes les étapes sont complétées
    }, [progress]);

    const markStepComplete = useCallback(async (stepKey, completed = true) => {
        if (!session?.user) return false;

        try {
            const response = await fetch('/api/onboarding/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: stepKey, completed, type: 'supplier' })
            });

            if (response.ok) {
                const data = await response.json();
                setProgress(data.progress || {});
                setIsCompleted(data.isCompleted || false);
                setCompletionPercentage(data.completionPercentage || 0);

                // Mettre à jour la prochaine étape
                const nextStep = getNextStep(data.progress || {});
                setCurrentStep(nextStep);

                return true;
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la progression:', error);
        }

        return false;
    }, [session, getNextStep]);

    const getStepByKey = useCallback((stepKey) => {
        return steps.find(step => step.key === stepKey);
    }, []);

    useEffect(() => {
        if (session?.user && (session.user.role === 'supplier' || session.user.role === 'fournisseur')) {
            fetchProgress();
        }
    }, [session, fetchProgress]);

    // Listen for onboarding completion events
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnboardingCompleted = () => {
            console.log('[useSupplierOnboarding] Onboarding completion event received, refreshing...');
            // Wait a bit for the API to process, then refresh
            setTimeout(() => {
                fetchProgress();
            }, 500);
        };

        window.addEventListener('onboarding-completed', handleOnboardingCompleted);
        window.addEventListener('onboarding-step-completed', handleOnboardingCompleted);

        return () => {
            window.removeEventListener('onboarding-completed', handleOnboardingCompleted);
            window.removeEventListener('onboarding-step-completed', handleOnboardingCompleted);
        };
    }, [fetchProgress]);

    return {
        progress,
        currentStep,
        isLoading,
        isCompleted,
        completionPercentage,
        steps,
        markStepComplete,
        getNextStep,
        getStepByKey,
        fetchProgress
    };
};

export default useSupplierOnboarding;

