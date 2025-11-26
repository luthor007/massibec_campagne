import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// Removed Dialog imports - using custom floating component instead
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Package,
    Building2,
    DollarSign,
    CreditCard,
    CheckCircle,
    ArrowRight,
    X,
    Sparkles,
    Info
} from 'lucide-react';
import useSupplierOnboarding from '@/hooks/useSupplierOnboarding';

const SupplierOnboardingWizard = ({ isOpen, onClose, currentPage, products = [], areAllProductsComplete = false }) => {
    const router = useRouter();
    const {
        progress,
        currentStep,
        isLoading,
        isCompleted,
        completionPercentage,
        steps,
        markStepComplete,
        fetchProgress
    } = useSupplierOnboarding();

    const [showSkipOption, setShowSkipOption] = useState(false);
    const [settingsStatus, setSettingsStatus] = useState({ hasTeam: false, hasCheque: false });
    const [stepJustCompleted, setStepJustCompleted] = useState(false);

    // Reset stepJustCompleted when step changes
    useEffect(() => {
        setStepJustCompleted(false);
    }, [currentStep?.key]);

    // Check settings step status
    useEffect(() => {
        if (currentStep?.key === 'settings') {
            const checkSettingsStatus = async () => {
                try {
                    const [managersResponse, paymentResponse] = await Promise.all([
                        fetch('/api/supplier/managers'),
                        fetch('/api/supplier/payment-info')
                    ]);

                    if (managersResponse.ok && paymentResponse.ok) {
                        const managersData = await managersResponse.json();
                        const paymentData = await paymentResponse.json();

                        const hasTeam = managersData.managers && managersData.managers.length > 0;
                        const hasCheque = !!paymentData.paymentInfo?.chequeSpecimen;

                        setSettingsStatus({ hasTeam, hasCheque });
                    }
                } catch (error) {
                    console.error('Error checking settings status:', error);
                }
            };
            checkSettingsStatus();
            // Re-check every 2 seconds when on settings page
            const interval = setInterval(checkSettingsStatus, 2000);
            return () => clearInterval(interval);
        }
    }, [currentStep?.key]);

    // Check if current step requirements are met
    const isStepComplete = () => {
        if (currentStep?.key === 'productCatalog') {
            // For product catalog step, check if all products are complete
            return areAllProductsComplete && products.length > 0;
        }
        if (currentStep?.key === 'settings') {
            // For settings step, check if team has members AND cheque is uploaded
            return settingsStatus.hasTeam && settingsStatus.hasCheque;
        }
        // For other steps, check if they're marked as complete in progress
        return progress[currentStep?.key] === true;
    };

    const canProceed = isStepComplete();

    // Si l'onboarding est complété, ne pas afficher le wizard
    if (isCompleted) {
        return null;
    }

    if (isLoading || !currentStep) {
        return null;
    }

    const handleNext = async () => {
        // For settings step, allow skipping even if conditions not met
        if (currentStep?.key === 'settings') {
            // Mark as complete even if team/cheque not done (user can skip)
            const success = await markStepComplete(currentStep.key, true);
            console.log('[SupplierOnboardingWizard] Marked settings step complete, success:', success);

            // Mark that this step was just completed to hide the warning
            setStepJustCompleted(true);

            // Wait a moment for the API to process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Refresh progress immediately to update the UI
            await fetchProgress();

            // Wait again and refresh to ensure we have the latest state
            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchProgress();

            // Check progress directly from API to get fresh data
            const freshProgressResponse = await fetch(`/api/onboarding/progress?type=supplier&_t=${Date.now()}`, {
                cache: 'no-store'
            });
            const freshProgressData = await freshProgressResponse.json();
            const freshProgress = freshProgressData.progress || {};

            console.log('[SupplierOnboardingWizard] Fresh progress after marking settings complete:', freshProgress);

            // If it's the last step, close wizard and trigger completion event
            const nextStep = steps.find(s => !freshProgress[s.key] && s.key !== currentStep.key);
            if (!nextStep) {
                // Wait a bit for the API to process, then check if onboarding is now complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh progress again to get latest state
                await fetchProgress();

                // Check if onboarding is now complete (force fresh check)
                const progressResponse = await fetch(`/api/onboarding/progress?type=supplier&_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                if (progressResponse.ok) {
                    const progressData = await progressResponse.json();
                    console.log('[SupplierOnboardingWizard] Final check - isCompleted:', progressData.isCompleted, 'Progress:', progressData.progress, 'CompletedSteps:', progressData.completedSteps, 'TotalSteps:', progressData.totalSteps);
                    if (progressData.isCompleted) {
                        // Dispatch event to notify that onboarding is completed
                        if (typeof window !== 'undefined') {
                            console.log('[SupplierOnboardingWizard] Onboarding completed! Dispatching events and reloading...');
                            // Dispatch multiple events to ensure all listeners catch it
                            window.dispatchEvent(new CustomEvent('onboarding-completed', { detail: { completed: true } }));
                            window.dispatchEvent(new CustomEvent('onboarding-completed', { detail: { completed: true } }));
                            // Wait a moment for events to propagate
                            setTimeout(() => {
                                // Force reload to ensure all components re-initialize
                                window.location.href = window.location.href;
                            }, 500);
                        }
                    } else {
                        console.warn('[SupplierOnboardingWizard] Onboarding not completed yet, progress:', progressData.progress);
                        // Still reload to check again
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } else {
                    console.error('[SupplierOnboardingWizard] Failed to check onboarding status');
                    // Reload anyway to ensure state is synced
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
                onClose();
                return;
            }

            // Dispatch event for step completion
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('onboarding-step-completed'));
            }

            // Redirect to next step if needed
            if (nextStep.route !== currentPage) {
                router.push(nextStep.route);
            }
            return;
        }

        // For other steps (like productCatalog), require completion
        if (!canProceed) {
            return; // Don't proceed if requirements are not met
        }

        // Marquer l'étape actuelle comme complétée
        const success = await markStepComplete(currentStep.key, true);

        // Dispatch event for step completion
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('onboarding-step-completed'));
        }

        // Si c'est la dernière étape, fermer le wizard et trigger completion event
        const nextStep = steps.find(s => !progress[s.key] && s.key !== currentStep.key);
        if (!nextStep) {
            console.log('[SupplierOnboardingWizard] Last step completed, checking if onboarding is done...');
            // Wait a bit for the API to process, then check if onboarding is now complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if onboarding is now complete (force fresh check)
            const progressResponse = await fetch(`/api/onboarding/progress?type=supplier&_t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                console.log('[SupplierOnboardingWizard] Final check - isCompleted:', progressData.isCompleted, 'Progress:', progressData.progress, 'CompletedSteps:', progressData.completedSteps, 'TotalSteps:', progressData.totalSteps);
                if (progressData.isCompleted) {
                    // Dispatch event to notify that onboarding is completed
                    if (typeof window !== 'undefined') {
                        console.log('[SupplierOnboardingWizard] Onboarding completed! Dispatching event and reloading...');
                        // Dispatch event immediately
                        window.dispatchEvent(new CustomEvent('onboarding-completed', { detail: { completed: true } }));
                        // Reload page immediately to ensure all components update
                        window.location.reload();
                    }
                } else {
                    console.warn('[SupplierOnboardingWizard] Onboarding not completed yet, progress:', progressData.progress);
                    // Still reload to check again
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                console.error('[SupplierOnboardingWizard] Failed to check onboarding status');
                // Reload anyway to ensure state is synced
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
            onClose();
            return;
        }

        // Rediriger vers la prochaine étape si nécessaire
        if (nextStep.route !== currentPage) {
            router.push(nextStep.route);
        }
    };

    const handleSkip = async () => {
        // Mark as complete even if conditions not met (user is skipping)
        const success = await markStepComplete(currentStep.key, true);
        console.log('[SupplierOnboardingWizard] Skipped step, marked complete, success:', success);

        // Mark that this step was just completed to hide the warning
        setStepJustCompleted(true);

        // Refresh progress immediately to update the UI
        await fetchProgress();

        // Wait a moment for the progress state to update
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh progress again to ensure we have the latest state
        await fetchProgress();

        // Check current progress to see what steps are completed
        const currentProgressResponse = await fetch('/api/onboarding/progress?type=supplier&_t=' + Date.now(), {
            cache: 'no-store'
        });
        const currentProgressData = await currentProgressResponse.json();
        const currentProgress = currentProgressData.progress || {};

        console.log('[SupplierOnboardingWizard] Skip - Current progress:', currentProgress);

        // If we're on settings step and productCatalog is not completed, complete it automatically
        if (currentStep?.key === 'settings' && !currentProgress.productCatalog) {
            console.log('[SupplierOnboardingWizard] Skip - productCatalog not completed, auto-completing it...');
            await markStepComplete('productCatalog', true);
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchProgress();
        }

        // Check if this was the last step
        const updatedProgressResponse = await fetch('/api/onboarding/progress?type=supplier&_t=' + Date.now(), {
            cache: 'no-store'
        });
        const updatedProgressData = await updatedProgressResponse.json();
        const updatedProgress = updatedProgressData.progress || {};

        console.log('[SupplierOnboardingWizard] Skip - Updated progress:', updatedProgress);

        const nextStep = steps.find(s => !updatedProgress[s.key] && s.key !== currentStep.key);

        if (!nextStep) {
            // This was the last step, wait for API to process
            console.log('[SupplierOnboardingWizard] Skip - Last step, waiting for API to process...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh progress in the hook first
            await fetchProgress();

            // Check if onboarding is now complete (force fresh check with multiple retries)
            let progressData = null;
            let retries = 5;
            while (retries > 0) {
                const progressResponse = await fetch(`/api/onboarding/progress?type=supplier&_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                if (progressResponse.ok) {
                    progressData = await progressResponse.json();
                    console.log('[SupplierOnboardingWizard] Skip - Check attempt:', 6 - retries, '- isCompleted:', progressData.isCompleted, 'Progress:', progressData.progress, 'CompletedSteps:', progressData.completedSteps, '/', progressData.totalSteps);
                    if (progressData.isCompleted) {
                        console.log('[SupplierOnboardingWizard] Skip - Onboarding confirmed as completed!');
                        break;
                    }
                }
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }

            if (progressData && progressData.isCompleted) {
                // Dispatch event to notify that onboarding is completed
                if (typeof window !== 'undefined') {
                    console.log('[SupplierOnboardingWizard] Onboarding completed via skip! Dispatching event and reloading...');
                    // Dispatch event before reload
                    window.dispatchEvent(new CustomEvent('onboarding-completed', { detail: { completed: true } }));
                    // Wait a moment for event to propagate
                    await new Promise(resolve => setTimeout(resolve, 300));
                    // Reload page to ensure all components update
                    window.location.reload();
                }
            } else {
                console.error('[SupplierOnboardingWizard] Skip - Onboarding NOT completed after retries!');
                console.error('Progress:', progressData?.progress);
                console.error('Expected: productCatalog=true, settings=true');
                console.error('Actual: productCatalog=' + (progressData?.progress?.productCatalog || false) + ', settings=' + (progressData?.progress?.settings || false));
                // Show more informative error
                alert(`Erreur: L'onboarding n'a pas pu être complété.\n\nÉtat actuel:\n- Catalogue produits: ${progressData?.progress?.productCatalog ? 'Complété' : 'Non complété'}\n- Paramètres: ${progressData?.progress?.settings ? 'Complété' : 'Non complété'}\n\nVeuillez rafraîchir la page.`);
                // Still reload to check again - the API might need more time
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
            onClose();
            return;
        }

        // If there's a next step, navigate to it
        if (nextStep.route !== currentPage) {
            router.push(nextStep.route);
        } else {
            // If we're already on the next step's page, just close the wizard
            onClose();
        }
    };

    const getStepIcon = (stepKey) => {
        switch (stepKey) {
            case 'productCatalog':
                return <Package className="w-6 h-6" />;
            case 'settings':
                return <CreditCard className="w-6 h-6" />;
            case 'companyInfo':
                return <Building2 className="w-6 h-6" />;
            case 'pricingConfig':
                return <DollarSign className="w-6 h-6" />;
            case 'paymentSetup':
                return <CreditCard className="w-6 h-6" />;
            default:
                return <Sparkles className="w-6 h-6" />;
        }
    };

    const getStepInstructions = (stepKey) => {
        switch (stepKey) {
            case 'productCatalog':
                return {
                    title: 'Bienvenue dans la gestion de vos produits !',
                    description: 'Cette page vous permet de gérer votre catalogue de produits et de configurer vos prix. Voici ce que vous devez faire :',
                    instructions: [
                        'Cliquez sur "Ajouter un produit" pour créer votre premier produit',
                        'Remplissez tous les champs requis : nom, description, prix pickup à l\'usine et image',
                        'Le prix de vente à l\'école sera calculé automatiquement (prix pickup + 5% + coût de livraison)',
                        'Le 5% de base couvre : gestion avec l\'école, montage des commandes, étiquettes et support client',
                        'Le coût de livraison est calculé automatiquement par produit selon le devis DMB et les données de pallet',
                        'Tous les produits doivent être complets avant de passer à l\'étape suivante',
                        'Les champs manquants seront surlignés en rouge pour vous guider'
                    ],
                    action: 'Complétez tous vos produits pour continuer'
                };
            case 'settings':
                return {
                    title: 'Bienvenue dans la configuration de vos paramètres !',
                    description: 'Cette page vous permet de configurer les paramètres de livraison, votre équipe et vos informations de paiement. Voici ce que vous devez faire :',
                    instructions: [
                        'Configurez vos paramètres de livraison : instructions de ramassage et option de livraison directe au consommateur',
                        'Ajoutez des membres à votre équipe pour vous aider à gérer votre organisation (section en bas de page)',
                        'Uploadez votre spécimen de chèque dans la section "Configuration des paiements" pour recevoir vos paiements',
                        'Cliquez sur "Enregistrer les paramètres" pour sauvegarder vos paramètres de livraison',
                        'Ces actions sont optionnelles - vous pouvez passer cette étape si vous préférez configurer plus tard'
                    ],
                    action: 'Configurez vos paramètres pour continuer'
                };
            case 'companyInfo':
                return {
                    title: 'Complétez les informations de votre entreprise',
                    description: 'Assurez-vous que toutes les informations de votre entreprise sont à jour :',
                    instructions: [
                        'Vérifiez votre nom d\'entreprise',
                        'Confirmez votre adresse et coordonnées',
                        'Ajoutez une description de votre entreprise si nécessaire',
                        'Mettez à jour votre logo si vous le souhaitez'
                    ],
                    action: 'Vérifiez et complétez vos informations'
                };
            case 'paymentSetup':
                return {
                    title: 'Configurez les paiements',
                    description: 'Configurez vos informations de paiement pour recevoir vos revenus :',
                    instructions: [
                        'Ajoutez vos informations bancaires',
                        'Configurez vos préférences de facturation',
                        'Vérifiez vos coordonnées de contact'
                    ],
                    action: 'Configurez vos paiements'
                };
            default:
                return {
                    title: 'Étape suivante',
                    description: 'Continuez avec l\'onboarding',
                    instructions: [],
                    action: 'Continuer'
                };
        }
    };

    const instructions = getStepInstructions(currentStep.key);
    const stepIndex = steps.findIndex(s => s.key === currentStep.key);
    const totalSteps = steps.length;

    if (!isOpen) return null;

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-5 h-5">
                        {getStepIcon(currentStep.key)}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">{instructions.title}</h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                            Étape {stepIndex + 1}/{totalSteps}
                        </p>
                    </div>
                </div>
                {/* Don't show close button during onboarding - it's required */}
            </div>

            <div className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Progression</span>
                        <span>{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-1.5" />
                </div>

                {/* Description */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-xs text-gray-700">{instructions.description}</p>
                </div>

                {/* Step-specific status */}
                {currentStep.key === 'productCatalog' && (
                    <div className={`border rounded-lg p-2 ${canProceed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                        }`}>
                        <div className="flex items-center gap-2">
                            {canProceed ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-green-800">
                                            ✓ Tous les produits sont complets !
                                        </p>
                                        <p className="text-xs text-green-700 mt-0.5">
                                            {products.length} produit(s) complet(s)
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Info className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-yellow-800">
                                            ⚠️ Produits incomplets
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-0.5">
                                            {products.length === 0
                                                ? 'Ajoutez au moins un produit complet'
                                                : `${products.filter(p => !(p.name && p.description && (p.pricePickup || p.price) && p.image)).length} incomplet(s)`
                                            }
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {currentStep.key === 'settings' && (
                    <div className={`border rounded-lg p-2 ${
                        // If step is already marked as complete in progress OR just completed, show as complete
                        progress[currentStep.key] === true || stepJustCompleted
                            ? 'bg-green-50 border-green-200'
                            : canProceed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-yellow-50 border-yellow-200'
                        }`}>
                        <div className="flex items-center gap-2">
                            {(progress[currentStep.key] === true || stepJustCompleted || canProceed) ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-green-800">
                                            ✓ Configuration complète !
                                        </p>
                                        <p className="text-xs text-green-700 mt-0.5">
                                            {canProceed
                                                ? 'Équipe configurée et spécimen de chèque uploadé'
                                                : 'Étape complétée (vous pouvez passer cette étape)'
                                            }
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Info className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-yellow-800">
                                            ⚠️ Configuration incomplète
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-0.5">
                                            {!settingsStatus.hasTeam && !settingsStatus.hasCheque
                                                ? 'Ajoutez des membres à votre équipe et uploadez votre spécimen de chèque (optionnel - vous pouvez passer cette étape)'
                                                : !settingsStatus.hasTeam
                                                    ? 'Ajoutez des membres à votre équipe (optionnel - vous pouvez passer cette étape)'
                                                    : 'Uploadez votre spécimen de chèque (optionnel - vous pouvez passer cette étape)'
                                            }
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Instructions - Compact */}
                <div className="space-y-1.5">
                    <h4 className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-blue-600" />
                        Instructions
                    </h4>
                    <ul className="space-y-1">
                        {instructions.instructions.slice(0, 3).map((instruction, index) => (
                            <li key={index} className="flex items-start gap-1.5 text-xs text-gray-700">
                                <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                                <span>{instruction}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Steps Overview - Very Compact */}
                <div className="border-t pt-2">
                    <div className="space-y-1">
                        {steps.map((step, index) => {
                            const isCompleted = progress[step.key];
                            const isCurrent = step.key === currentStep.key;
                            return (
                                <div
                                    key={step.key}
                                    className={`flex items-center gap-1.5 p-1 rounded text-xs ${isCurrent ? 'bg-blue-50' : ''}`}
                                >
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isCompleted
                                        ? 'bg-green-600 text-white'
                                        : isCurrent
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {isCompleted ? (
                                            <CheckCircle className="w-2.5 h-2.5" />
                                        ) : (
                                            <span className="text-[10px] font-semibold">{index + 1}</span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate ${isCurrent ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>
                                        {step.title}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                    {currentStep.key === 'settings' && !canProceed && (
                        <Button
                            onClick={handleSkip}
                            size="sm"
                            variant="outline"
                            className="text-xs text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                            Passer cette étape
                        </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                        onClick={handleNext}
                        size="sm"
                        disabled={currentStep.key !== 'settings' && !canProceed}
                        className={`text-xs ${(canProceed || currentStep.key === 'settings')
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-300 cursor-not-allowed'
                            } text-white`}
                    >
                        {isCompleted ? 'Terminer' : (canProceed || currentStep.key === 'settings') ? 'Compris' : 'Continuer'}
                        {(canProceed || currentStep.key === 'settings') && <ArrowRight className="w-3 h-3 ml-1.5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SupplierOnboardingWizard;

