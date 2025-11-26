import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ChevronLeft,
    ChevronRight,
    Package,
    Calendar,
    DollarSign,
    CheckCircle2,
    Target
} from 'lucide-react';
import SupplierCard from './SupplierCard';
import ChatModal from '../Messaging/ChatModal';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';

const STEPS = [
    { id: 1, title: 'Sélectionner un Fournisseur', icon: Package },
    { id: 2, title: 'Dates de la Campagne', icon: Calendar },
    { id: 3, title: 'Objectif Financier', icon: DollarSign },
];

const CampaignWizard = ({
    onComplete,
    school,
    initialData = {},
    onStartChat
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [selectedSupplierId, setSelectedSupplierId] = useState(initialData.supplierId || null);
    const [minimumDeliveryDays, setMinimumDeliveryDays] = useState(21); // Default to 21 days
    const [deliveryDateError, setDeliveryDateError] = useState('');
    const [truckArrivalError, setTruckArrivalError] = useState('');
    const [formData, setFormData] = useState({
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        deliveryDate: initialData.deliveryDate || '',
        financialGoal: initialData.financialGoal || '',
        distributionStartHour: initialData.distributionStartHour || '',
        distributionEndHour: initialData.distributionEndHour || '',
        truckArrivalHour: initialData.truckArrivalHour || ''
    });

    // Load suppliers on mount
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                setLoadingSuppliers(true);
                const schoolId = school?._id || school?.id;
                const url = schoolId
                    ? `/api/suppliers?schoolId=${schoolId}`
                    : '/api/suppliers';

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setSuppliers(data.suppliers || []);
                } else {
                    toast.error('Erreur lors du chargement des fournisseurs');
                }
            } catch (error) {
                console.error('Error fetching suppliers:', error);
                toast.error('Erreur lors du chargement des fournisseurs');
            } finally {
                setLoadingSuppliers(false);
            }
        };

        fetchSuppliers();
    }, [school]);

    // Calculate minimum delivery date
    const getMinDeliveryDate = () => {
        if (!formData.endDate) {
            return formData.startDate || '';
        }

        const endDate = new Date(formData.endDate + 'T00:00:00');
        const daysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
        const minDeliveryDate = new Date(endDate.getTime() + daysInMillis);

        const year = minDeliveryDate.getFullYear();
        const month = String(minDeliveryDate.getMonth() + 1).padStart(2, '0');
        const day = String(minDeliveryDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Real-time validation for delivery date
    const validateDeliveryDate = (deliveryDate, endDate) => {
        if (!deliveryDate || !endDate) {
            setDeliveryDateError('');
            return;
        }

        const end = new Date(endDate + 'T00:00:00');
        const delivery = new Date(deliveryDate + 'T00:00:00');
        end.setHours(0, 0, 0, 0);
        delivery.setHours(0, 0, 0, 0);

        const requiredDaysInMillis = minimumDeliveryDays * 24 * 60 * 60 * 1000;
        const timeDiff = delivery.getTime() - end.getTime();
        const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));

        if (timeDiff < requiredDaysInMillis) {
            setDeliveryDateError(`La date de livraison doit être au moins ${minimumDeliveryDays} jour${minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne. Actuellement: ${daysDiff} jour${daysDiff > 1 ? 's' : ''}.`);
        } else {
            setDeliveryDateError('');
        }
    };

    // Fetch minimumDeliveryDays when supplier is selected
    useEffect(() => {
        if (!selectedSupplierId) {
            setMinimumDeliveryDays(21); // Reset to default
            return;
        }

        const fetchSupplierDeliverySettings = async () => {
            try {
                const response = await fetch(`/api/suppliers?id=${selectedSupplierId}`);
                if (response.ok) {
                    const data = await response.json();
                    const supplier = data.supplier || null;
                    if (supplier?.deliverySettings?.minimumDeliveryDays) {
                        setMinimumDeliveryDays(supplier.deliverySettings.minimumDeliveryDays);
                    } else {
                        setMinimumDeliveryDays(21);
                    }
                    // Re-validate delivery date if it's already set
                    if (formData.deliveryDate && formData.endDate) {
                        validateDeliveryDate(formData.deliveryDate, formData.endDate);
                    }
                }
            } catch (error) {
                console.error('Error fetching supplier delivery settings:', error);
            }
        };

        fetchSupplierDeliverySettings();
    }, [selectedSupplierId, formData.deliveryDate, formData.endDate]);

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const updated = {
                ...prev,
                [field]: value
            };

            // Real-time validation for delivery date
            if (field === 'deliveryDate' || field === 'endDate') {
                validateDeliveryDate(updated.deliveryDate, updated.endDate);
            }

            // Real-time validation for truck arrival hour
            if (field === 'truckArrivalHour' || field === 'distributionStartHour') {
                validateTruckArrivalHour(updated.truckArrivalHour, updated.distributionStartHour);
            }

            return updated;
        });
    };

    // Real-time validation for truck arrival hour
    const validateTruckArrivalHour = (truckArrivalHour, distributionStartHour) => {
        if (!truckArrivalHour || !distributionStartHour) {
            setTruckArrivalError('');
            return;
        }

        // Parse hours in format "XXhXX" (e.g., "08h15")
        const truckMatch = truckArrivalHour.match(/(\d{2})h(\d{2})/);
        const distributionMatch = distributionStartHour.match(/(\d{2})h(\d{2})/);

        if (!truckMatch || !distributionMatch) {
            setTruckArrivalError('');
            return;
        }

        const truckHour = parseInt(truckMatch[1]);
        const truckMinutes = parseInt(truckMatch[2]);
        const truckTotalMinutes = truckHour * 60 + truckMinutes;

        const distributionHour = parseInt(distributionMatch[1]);
        const distributionMinutes = parseInt(distributionMatch[2]);
        const distributionTotalMinutes = distributionHour * 60 + distributionMinutes;

        const timeDiff = distributionTotalMinutes - truckTotalMinutes;

        if (timeDiff < 15) {
            const minutesShort = 15 - timeDiff;
            setTruckArrivalError(`L'heure d'arrivée du camion doit être au moins 15 minutes avant le début de la distribution. Il manque ${minutesShort} minute${minutesShort > 1 ? 's' : ''}.`);
        } else {
            setTruckArrivalError('');
        }
    };

    const handleSupplierSelect = (supplierId) => {
        setSelectedSupplierId(supplierId);
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!selectedSupplierId) {
                    toast.error('Veuillez sélectionner un fournisseur');
                    return false;
                }
                return true;
            case 2:
                if (!formData.startDate || !formData.endDate || !formData.deliveryDate) {
                    toast.error('Veuillez remplir toutes les dates');
                    return false;
                }
                const startDate = new Date(formData.startDate);
                const endDate = new Date(formData.endDate);
                const deliveryDate = new Date(formData.deliveryDate);

                if (endDate < startDate) {
                    toast.error('La date de fin doit être après la date de début');
                    return false;
                }
                if (deliveryDate < endDate) {
                    toast.error('La date de livraison doit être après la date de fin');
                    return false;
                }

                // Validate truck arrival hour if both are provided
                if (formData.truckArrivalHour && formData.distributionStartHour) {
                    const truckMatch = formData.truckArrivalHour.match(/(\d{2})h(\d{2})/);
                    const distributionMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);

                    if (truckMatch && distributionMatch) {
                        const truckHour = parseInt(truckMatch[1]);
                        const truckMinutes = parseInt(truckMatch[2]);
                        const truckTotalMinutes = truckHour * 60 + truckMinutes;

                        const distributionHour = parseInt(distributionMatch[1]);
                        const distributionMinutes = parseInt(distributionMatch[2]);
                        const distributionTotalMinutes = distributionHour * 60 + distributionMinutes;

                        const timeDiff = distributionTotalMinutes - truckTotalMinutes;

                        if (timeDiff < 15) {
                            toast.error('L\'heure d\'arrivée du camion doit être au moins 15 minutes avant le début de la distribution');
                            return false;
                        }
                    }
                }

                return true;
            case 3:
                if (!formData.financialGoal || parseFloat(formData.financialGoal) <= 0) {
                    toast.error('Veuillez entrer un objectif financier valide');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) {
            return;
        }

        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        if (!validateStep(currentStep)) {
            return;
        }

        onComplete({
            supplierId: selectedSupplierId,
            ...formData,
            financialGoal: parseFloat(formData.financialGoal) || 0
        });
    };

    const progress = (currentStep / STEPS.length) * 100;
    const CurrentStepIcon = STEPS[currentStep - 1]?.icon || Target;

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Choisissez votre fournisseur
                            </h3>
                            <p className="text-sm text-gray-600">
                                Comparez les fournisseurs disponibles et sélectionnez celui qui correspond le mieux à vos besoins
                            </p>
                        </div>

                        {loadingSuppliers ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Chargement des fournisseurs...</p>
                            </div>
                        ) : suppliers.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-2">Aucun fournisseur disponible pour le moment.</p>
                                <p className="text-sm text-gray-500">Veuillez contacter l'administrateur.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {suppliers.map((supplier) => (
                                    <SupplierCard
                                        key={supplier._id}
                                        supplier={supplier}
                                        isSelected={selectedSupplierId === supplier._id}
                                        onSelect={handleSupplierSelect}
                                        {...(onStartChat && { onStartChat })}
                                        averageProfitMargin={supplier.averageProfitMargin}
                                        totalCampaigns={supplier.totalCampaigns}
                                        averageRating={supplier.averageRating}
                                        reviewCount={supplier.reviewCount}
                                        distance={supplier.distance}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Définissez les dates de votre campagne
                            </h3>
                            <p className="text-sm text-gray-600">
                                Planifiez les dates de début, de fin et de livraison de votre campagne
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                                    Date de début *
                                </Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                                    className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                                    Date de fin *
                                </Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                                    className="mt-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    required
                                    min={formData.startDate}
                                />
                            </div>

                            <div>
                                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">
                                    Date de livraison *
                                </Label>
                                <Input
                                    id="deliveryDate"
                                    type="date"
                                    value={formData.deliveryDate}
                                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                                    className={`mt-1 border-2 rounded-lg focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${deliveryDateError
                                        ? 'border-red-300 focus:border-red-500'
                                        : 'border-gray-200 focus:border-blue-500'
                                        }`}
                                    required
                                    min={getMinDeliveryDate() || formData.endDate || formData.startDate}
                                />
                                {deliveryDateError ? (
                                    <p className="text-xs text-red-600 mt-1 font-medium">
                                        ⚠️ {deliveryDateError}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Doit être au moins {minimumDeliveryDays} jour{minimumDeliveryDays > 1 ? 's' : ''} après la fin de la campagne
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-3">
                                    Indiquez les heures pendant lesquelles les parents et les élèves pourront venir à l'école ramasser leurs commandes.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="distributionStartHour" className="text-sm font-medium text-gray-700">
                                        Heure de début de distribution
                                    </Label>
                                    <Select
                                        value={formData.distributionStartHour}
                                        onValueChange={(value) => handleInputChange('distributionStartHour', value)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Sélectionner une heure" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 60 }, (_, i) => {
                                                const totalMinutes = (i * 15) + (7 * 60); // From 7h00 to 21h45 (15-minute intervals)
                                                const hour = Math.floor(totalMinutes / 60);
                                                const minutes = totalMinutes % 60;
                                                const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;
                                                return (
                                                    <SelectItem key={hourStr} value={hourStr}>
                                                        {hourStr}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="distributionEndHour" className="text-sm font-medium text-gray-700">
                                        Heure de fin de distribution
                                    </Label>
                                    <Select
                                        value={formData.distributionEndHour}
                                        onValueChange={(value) => handleInputChange('distributionEndHour', value)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Sélectionner une heure" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 60 }, (_, i) => {
                                                const totalMinutes = (i * 15) + (7 * 60); // From 7h00 to 21h45 (15-minute intervals)
                                                const hour = Math.floor(totalMinutes / 60);
                                                const minutes = totalMinutes % 60;
                                                const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;

                                                // Only show times after the start hour (at least 15 minutes later)
                                                if (formData.distributionStartHour) {
                                                    const startMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
                                                    if (startMatch) {
                                                        const startHour = parseInt(startMatch[1]);
                                                        const startMinutes = parseInt(startMatch[2]);
                                                        const startTotalMinutes = startHour * 60 + startMinutes;
                                                        if (totalMinutes <= startTotalMinutes) {
                                                            return null;
                                                        }
                                                    }
                                                }

                                                return (
                                                    <SelectItem key={hourStr} value={hourStr}>
                                                        {hourStr}
                                                    </SelectItem>
                                                );
                                            }).filter(Boolean)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Truck Arrival Hour */}
                            <div className="mt-4">
                                <Label htmlFor="truckArrivalHour" className="text-sm font-medium text-gray-700">
                                    Heure d'arrivée du camion de livraison
                                </Label>
                                <p className="text-xs text-gray-500 mt-1 mb-2">
                                    Heure à laquelle le camion de livraison arrivera à l'école pour le déchargement des produits
                                </p>
                                <Select
                                    value={formData.truckArrivalHour}
                                    onValueChange={(value) => handleInputChange('truckArrivalHour', value)}
                                >
                                    <SelectTrigger className={`mt-1 ${truckArrivalError ? 'border-red-300 focus:border-red-500' : ''}`}>
                                        <SelectValue placeholder="Sélectionner une heure" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 48 }, (_, i) => {
                                            const totalMinutes = (i * 15) + (5 * 60); // From 5h00 to 20h45 (15-minute intervals)
                                            const hour = Math.floor(totalMinutes / 60);
                                            const minutes = totalMinutes % 60;
                                            const hourStr = hour < 10 ? `0${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}` : `${hour}h${minutes === 0 ? '00' : minutes < 10 ? `0${minutes}` : minutes}`;

                                            // Filter out times that are too close to distribution start hour
                                            if (formData.distributionStartHour) {
                                                const distributionMatch = formData.distributionStartHour.match(/(\d{2})h(\d{2})/);
                                                if (distributionMatch) {
                                                    const distributionHour = parseInt(distributionMatch[1]);
                                                    const distributionMinutes = parseInt(distributionMatch[2]);
                                                    const distributionTotalMinutes = distributionHour * 60 + distributionMinutes;

                                                    // Only show times that are at least 15 minutes before distribution start
                                                    if (totalMinutes >= distributionTotalMinutes - 15) {
                                                        return null;
                                                    }
                                                }
                                            }

                                            return (
                                                <SelectItem key={hourStr} value={hourStr}>
                                                    {hourStr}
                                                </SelectItem>
                                            );
                                        }).filter(Boolean)}
                                    </SelectContent>
                                </Select>
                                {truckArrivalError ? (
                                    <p className="text-xs text-red-600 mt-1 font-medium">
                                        ⚠️ {truckArrivalError}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Doit être au moins 15 minutes avant le début de la distribution
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Définissez votre objectif financier
                            </h3>
                            <p className="text-sm text-gray-600">
                                Indiquez le montant total que vous souhaitez récolter avec cette campagne
                            </p>
                        </div>

                        <div className="max-w-md mx-auto">
                            <Label htmlFor="financialGoal" className="text-sm font-medium text-gray-700">
                                Montant cible (CAD) *
                            </Label>
                            <Input
                                id="financialGoal"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.financialGoal}
                                onChange={(e) => handleInputChange('financialGoal', e.target.value)}
                                placeholder="0.00"
                                className="mt-1 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 text-lg"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Le montant total que vous souhaitez récolter avec cette campagne
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    {STEPS.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isActive
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'bg-gray-100 border-gray-300 text-gray-400'
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6" />
                                        ) : (
                                            <StepIcon className="w-6 h-6" />
                                        )}
                                    </div>
                                    <span
                                        className={`mt-2 text-xs font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                                            }`}
                                    >
                                        {step.title}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Step Content */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <CurrentStepIcon className="h-6 w-6 text-blue-600" />
                        <span>{STEPS[currentStep - 1]?.title}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {renderStepContent()}
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="flex items-center space-x-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Précédent</span>
                </Button>

                <Button
                    onClick={handleNext}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                    <span>{currentStep === STEPS.length ? 'Créer la campagne' : 'Suivant'}</span>
                    {currentStep < STEPS.length && <ChevronRight className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}

export default function CampaignWizardWrapper(props) {
    const { data: session } = useSession();
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatSupplierId, setChatSupplierId] = useState(null);

    const handleStartChat = (supplierId) => {
        setChatSupplierId(supplierId);
        setShowChatModal(true);
    };

    return (
        <>
            <CampaignWizard
                {...props}
                onStartChat={handleStartChat}
            />
            {props.school && (
                <ChatModal
                    isOpen={showChatModal}
                    onClose={() => {
                        setShowChatModal(false);
                        setChatSupplierId(null);
                    }}
                    schoolId={props.school._id || props.school.id}
                    supplierId={chatSupplierId}
                    userRole={session?.user?.role}
                />
            )}
        </>
    );
}

