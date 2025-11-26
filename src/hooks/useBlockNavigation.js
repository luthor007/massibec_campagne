import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export const useBlockNavigation = (allowedRoutes = []) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(null);
    const isOnboardingCompleteRef = useRef(true);
    const isLoadingRef = useRef(true);

    const checkOnboarding = useCallback(async () => {
        if (status === 'loading' || !session) return;

        // Only block navigation for suppliers
        if (session.user.role !== 'supplier' && session.user.role !== 'fournisseur') {
            setIsOnboardingComplete(true);
            isOnboardingCompleteRef.current = true;
            setIsLoading(false);
            isLoadingRef.current = false;
            return;
        }

        try {
            // Force a fresh check by adding a cache-busting parameter
            const response = await fetch(`/api/onboarding/progress?type=supplier&_t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            if (response.ok) {
                const data = await response.json();
                const completed = data.isCompleted || false;
                const completedSteps = data.completedSteps || 0;
                const totalSteps = data.totalSteps || 2;

                console.log('[useBlockNavigation] Onboarding status:', {
                    completed,
                    completedSteps,
                    totalSteps,
                    progress: data.progress,
                    productCatalog: data.progress?.productCatalog,
                    settings: data.progress?.settings
                });

                setIsOnboardingComplete(completed);
                isOnboardingCompleteRef.current = completed;

                // Determine current step
                if (!completed) {
                    const steps = ['productCatalog', 'settings'];
                    const incompleteStep = steps.find(step => !data.progress[step]);
                    setCurrentStep(incompleteStep);
                } else {
                    setCurrentStep(null);
                    console.log('[useBlockNavigation] Onboarding completed! Unlocking navigation...');
                }
            }
        } catch (error) {
            console.error('[useBlockNavigation] Error checking onboarding:', error);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [session, status]);

    useEffect(() => {
        // Always check on mount and when dependencies change
        checkOnboarding();
    }, [checkOnboarding]);

    // Also check when the page becomes visible (after reload)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[useBlockNavigation] Page became visible, re-checking onboarding...');
                checkOnboarding();
            }
        };

        const handleFocus = () => {
            console.log('[useBlockNavigation] Window focused, re-checking onboarding...');
            checkOnboarding();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [checkOnboarding]);

    // Listen for onboarding completion events
    useEffect(() => {
        if (status === 'loading' || !session) return;
        if (session.user.role !== 'supplier' && session.user.role !== 'fournisseur') return;

        const handleOnboardingUpdate = () => {
            console.log('[useBlockNavigation] Onboarding update event received, re-checking...');
            // Multiple checks with increasing delays to ensure we catch the update
            setTimeout(() => {
                checkOnboarding();
            }, 300);
            setTimeout(() => {
                checkOnboarding();
            }, 800);
            setTimeout(() => {
                checkOnboarding();
            }, 1500);
        };

        // Listen for custom event when onboarding is completed
        window.addEventListener('onboarding-completed', handleOnboardingUpdate);
        window.addEventListener('onboarding-step-completed', handleOnboardingUpdate);

        // Also check periodically (every 2 seconds) during onboarding
        const interval = setInterval(() => {
            if (!isOnboardingCompleteRef.current && !isLoadingRef.current) {
                checkOnboarding();
            }
        }, 2000);

        return () => {
            window.removeEventListener('onboarding-completed', handleOnboardingUpdate);
            window.removeEventListener('onboarding-step-completed', handleOnboardingUpdate);
            clearInterval(interval);
        };
    }, [session, status, checkOnboarding]);

    // Block page access if trying to access non-allowed route during onboarding
    useEffect(() => {
        if (isLoading || isOnboardingComplete) return;
        if (!session || (session.user.role !== 'supplier' && session.user.role !== 'fournisseur')) return;

        const currentRoute = router.pathname;
        const isAllowed = allowedRoutes.includes(currentRoute);

        if (!isAllowed && currentStep) {
            // Redirect to current onboarding step
            const stepRoutes = {
                'productCatalog': '/dashboard-supplier/products',
                'settings': '/dashboard-supplier/settings'
            };
            const redirectRoute = stepRoutes[currentStep];
            if (redirectRoute && currentRoute !== redirectRoute) {
                router.push(redirectRoute);
            }
        }
    }, [isLoading, isOnboardingComplete, router.pathname, currentStep, allowedRoutes, session, router]);

    const canNavigate = (route) => {
        // During loading, allow navigation optimistically (assume onboarding is complete)
        // This prevents the flash of blocked items during initial load
        if (isLoading) return true;

        // If onboarding is complete, allow all navigation
        if (isOnboardingComplete) return true;

        // Always allow navigation to allowed routes (current onboarding step)
        if (allowedRoutes.includes(route)) return true;

        // Block navigation to other routes during onboarding
        return false;
    };

    const handleNavigation = (route, e) => {
        if (!canNavigate(route)) {
            e?.preventDefault();
            e?.stopPropagation();
            return false;
        }
        return true;
    };

    return {
        isOnboardingComplete,
        isLoading,
        currentStep,
        canNavigate,
        handleNavigation,
        blockSidebar: !isOnboardingComplete && !isLoading
    };
};

