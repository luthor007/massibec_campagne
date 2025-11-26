import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import SupplierTeamManagement from '../../../components/Dashboard/Supplier/SupplierTeamManagement';
import SupplierOnboardingWizard from '../../../components/Dashboard/Supplier/SupplierOnboardingWizard';
import useSupplierOnboarding from '@/hooks/useSupplierOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Users, Truck, DollarSign, Package, CreditCard, Upload, X, CheckCircle, Building2, Globe, Mail, Phone, MapPin, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SettingsPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [deliverySettings, setDeliverySettings] = useState({
        pickupInstructions: '',
        directToConsumerEnabled: false,
        directToConsumerFee: 0,
        directToConsumerRegion: '',
        minimumDeliveryDays: 21
    });
    const [supplierInfo, setSupplierInfo] = useState({
        companyEmail: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        ville: '',
        codePostal: '',
        description: '',
        website: '',
        certifications: [],
        logo: '',
        visibleInList: false
    });
    const [logoUrl, setLogoUrl] = useState(null);
    const [newCertification, setNewCertification] = useState('');
    const [chequeSpecimen, setChequeSpecimen] = useState(null);
    const [uploadingCheque, setUploadingCheque] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // Onboarding
    const {
        currentStep,
        isLoading: onboardingLoading,
        isCompleted: onboardingCompleted
    } = useSupplierOnboarding();
    const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

    const checkAndMarkSettingsComplete = useCallback(async (chequeUrl = null) => {
        try {
            // Check if team has at least one member and cheque is uploaded
            const managersResponse = await fetch('/api/supplier/managers');
            if (managersResponse.ok) {
                const managersData = await managersResponse.json();
                const hasTeamMembers = managersData.managers && managersData.managers.length > 0;
                // Use chequeUrl parameter if provided, otherwise check current state
                const currentCheque = chequeUrl || chequeSpecimen;
                const hasCheque = !!currentCheque;

                if (hasTeamMembers && hasCheque) {
                    // Mark settings step as complete
                    const progressResponse = await fetch('/api/onboarding/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 'settings', completed: true, type: 'supplier' })
                    });
                    if (progressResponse.ok) {
                        toast.success('Étape de configuration complétée!');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking settings completion:', error);
        }
    }, [chequeSpecimen]);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/connexion');
            return;
        }
        if (session.user.role !== 'supplier') {
            router.push('/dashboard');
            return;
        }
        fetchSettings();

        // Expose checkSettingsCompletion to window for SupplierTeamManagement callback
        if (typeof window !== 'undefined') {
            window.checkSettingsCompletion = () => {
                checkAndMarkSettingsComplete();
            };
        }

        return () => {
            if (typeof window !== 'undefined') {
                delete window.checkSettingsCompletion;
            }
        };
    }, [session, status, router, checkAndMarkSettingsComplete]);

    // Show onboarding wizard if not completed and on settings step
    useEffect(() => {
        if (!onboardingLoading && !onboardingCompleted && currentStep?.key === 'settings') {
            setShowOnboardingWizard(true);
        } else {
            setShowOnboardingWizard(false);
        }
    }, [onboardingLoading, onboardingCompleted, currentStep]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            // Fetch supplier info
            const supplierResponse = await fetch('/api/supplier/info');
            if (supplierResponse.ok) {
                const supplierData = await supplierResponse.json();
                setSupplierInfo({
                    name: supplierData.supplier?.name || '',
                    email: supplierData.supplier?.email || '',
                    companyEmail: supplierData.supplier?.companyEmail || '',
                    phone: supplierData.supplier?.phone || '',
                    address: supplierData.supplier?.address || '',
                    ville: supplierData.supplier?.ville || '',
                    codePostal: supplierData.supplier?.codePostal || '',
                    description: supplierData.supplier?.description || '',
                    website: supplierData.supplier?.website || '',
                    certifications: supplierData.supplier?.certifications || [],
                    logo: supplierData.supplier?.logo || '',
                    visibleInList: supplierData.supplier?.visibleInList || false
                });
                setLogoUrl(supplierData.supplier?.logoUrl || null);
            }

            // Fetch delivery settings
            const deliveryResponse = await fetch('/api/supplier/delivery-settings');
            if (deliveryResponse.ok) {
                const deliveryData = await deliveryResponse.json();
                setDeliverySettings(deliveryData.deliverySettings || {
                    pickupInstructions: '',
                    directToConsumerEnabled: false,
                    directToConsumerFee: 0,
                    directToConsumerRegion: '',
                    minimumDeliveryDays: 21
                });
            }

            // Fetch payment info
            const paymentResponse = await fetch('/api/supplier/payment-info');
            if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json();
                setChequeSpecimen(paymentData.paymentInfo?.chequeSpecimen || null);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Erreur lors de la récupération des paramètres');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInfo = async () => {
        setSavingInfo(true);
        try {
            const response = await fetch('/api/supplier/info', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: supplierInfo.name,
                    email: supplierInfo.email,
                    companyEmail: supplierInfo.companyEmail,
                    phone: supplierInfo.phone,
                    address: supplierInfo.address,
                    ville: supplierInfo.ville,
                    codePostal: supplierInfo.codePostal,
                    description: supplierInfo.description,
                    website: supplierInfo.website,
                    certifications: supplierInfo.certifications,
                    visibleInList: supplierInfo.visibleInList
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSupplierInfo({
                    name: data.supplier.name,
                    email: data.supplier.email,
                    companyEmail: data.supplier.companyEmail || '',
                    phone: data.supplier.phone,
                    address: data.supplier.address,
                    ville: data.supplier.ville,
                    codePostal: data.supplier.codePostal,
                    description: data.supplier.description,
                    website: data.supplier.website,
                    certifications: data.supplier.certifications || [],
                    visibleInList: data.supplier.visibleInList || false
                });
                toast.success('Informations mises à jour avec succès');
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Error saving supplier info:', error);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSavingInfo(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            console.log('[Settings Page] Saving delivery settings:', deliverySettings);

            const response = await fetch('/api/supplier/delivery-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deliverySettings)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Settings Page] Save response:', data);

                // Update local state with server response to ensure consistency
                if (data.deliverySettings) {
                    setDeliverySettings(data.deliverySettings);
                }

                toast.success('Paramètres de livraison mis à jour avec succès');

                // Reload settings to ensure we have the latest data
                await fetchSettings();
            } else {
                const error = await response.json();
                console.error('[Settings Page] Save error:', error);
                toast.error(error.message || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Error saving delivery settings:', error);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleAddCertification = () => {
        if (newCertification.trim() && !supplierInfo.certifications.includes(newCertification.trim())) {
            setSupplierInfo({
                ...supplierInfo,
                certifications: [...supplierInfo.certifications, newCertification.trim()]
            });
            setNewCertification('');
        }
    };

    const handleRemoveCertification = (index) => {
        setSupplierInfo({
            ...supplierInfo,
            certifications: supplierInfo.certifications.filter((_, i) => i !== index)
        });
    };

    const handleLogoFileChange = async (file) => {
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('Seuls les fichiers image sont autorisés');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Le fichier ne doit pas dépasser 5MB');
            return;
        }

        // Upload immediately
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch('/api/supplier/upload-logo', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Settings Page] Logo uploaded successfully:', data.logoUrl);

                // Update state immediately
                setLogoUrl(data.logoUrl);
                setSupplierInfo({ ...supplierInfo, logo: data.logo });
                toast.success('Logo uploadé avec succès');

                // Refresh settings to ensure persistence
                await fetchSettings();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de l\'upload');
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Erreur lors de l\'upload');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleLogoInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleLogoFileChange(file);
        }
        // Reset input to allow selecting the same file again
        e.target.value = '';
    };

    const handleLogoDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
    };

    const handleLogoDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    };

    const handleLogoDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

        const file = e.dataTransfer.files[0];
        if (file) {
            handleLogoFileChange(file);
        }
    };

    const handleChequeFileChange = async (file) => {
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('Seuls les fichiers image sont autorisés');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Le fichier ne doit pas dépasser 5MB');
            return;
        }

        // Upload immediately
        setUploadingCheque(true);
        try {
            const formData = new FormData();
            formData.append('chequeSpecimen', file);

            const response = await fetch('/api/supplier/upload-cheque-specimen', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Settings Page] Cheque uploaded successfully:', data.chequeSpecimenUrl);

                // Update state immediately
                setChequeSpecimen(data.chequeSpecimenUrl);
                toast.success('Spécimen de chèque uploadé avec succès');

                // Wait a moment for the database to be updated (the API uses updateOne which should be immediate, but wait a bit to be safe)
                await new Promise(resolve => setTimeout(resolve, 800));

                // Refresh settings to ensure persistence - fetch directly from API
                const paymentResponse = await fetch('/api/supplier/payment-info?t=' + Date.now(), {
                    cache: 'no-store'
                });
                if (paymentResponse.ok) {
                    const paymentData = await paymentResponse.json();
                    console.log('[Settings Page] Fetched payment info after upload:', paymentData.paymentInfo);
                    if (paymentData.paymentInfo?.chequeSpecimen) {
                        setChequeSpecimen(paymentData.paymentInfo.chequeSpecimen);
                        console.log('[Settings Page] Cheque specimen persisted:', paymentData.paymentInfo.chequeSpecimen);
                    } else {
                        console.warn('[Settings Page] Cheque specimen not found in payment info after upload');
                    }
                }

                // Mark settings step as complete if team has members and cheque is uploaded
                await checkAndMarkSettingsComplete(data.chequeSpecimenUrl);
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de l\'upload');
            }
        } catch (error) {
            console.error('Error uploading cheque:', error);
            toast.error('Erreur lors de l\'upload');
        } finally {
            setUploadingCheque(false);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleChequeFileChange(file);
        }
        // Reset input to allow selecting the same file again
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

        const file = e.dataTransfer.files[0];
        if (file) {
            handleChequeFileChange(file);
        }
    };


    return (
        <DashboardLayout>
            <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                        {!showOnboardingWizard && (
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/dashboard-supplier')}
                                className="mb-2 text-xs sm:text-sm px-2 sm:px-3"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Retour au tableau de bord</span>
                                <span className="sm:hidden">Retour</span>
                            </Button>
                        )}
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Paramètres</h1>
                        <p className="text-sm sm:text-base text-gray-600">Gérez les paramètres de votre organisation</p>
                    </div>
                </div>

                {/* Onboarding Wizard */}
                {showOnboardingWizard && (
                    <div className="mt-4">
                        <SupplierOnboardingWizard
                            isOpen={showOnboardingWizard}
                            onClose={() => {
                                // Don't allow closing during onboarding - it's required
                                if (onboardingCompleted) {
                                    setShowOnboardingWizard(false);
                                }
                            }}
                            currentPage="/dashboard-supplier/settings"
                            products={[]}
                            areAllProductsComplete={true}
                        />
                    </div>
                )}

                {/* Supplier Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Informations de l'entreprise
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Logo Upload */}
                        <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Logo de l'entreprise
                            </Label>
                            <p className="text-xs text-gray-500 mb-4">
                                Uploadez le logo de votre entreprise. Il sera affiché sur votre profil et dans les campagnes.
                            </p>

                            {logoUrl && (
                                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-sm text-gray-700">Logo uploadé</span>
                                        </div>
                                    </div>
                                    <img
                                        src={logoUrl}
                                        alt="Logo de l'entreprise"
                                        className="max-h-32 max-w-full object-contain rounded border border-gray-300 bg-white p-2"
                                    />
                                </div>
                            )}

                            {!logoUrl && (
                                <div
                                    onDragOver={handleLogoDragOver}
                                    onDragLeave={handleLogoDragLeave}
                                    onDrop={handleLogoDrop}
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors"
                                >
                                    {uploadingLogo ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            <p className="text-sm text-gray-600">Upload en cours...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <Label htmlFor="logo" className="cursor-pointer">
                                                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                                    Cliquez pour sélectionner un fichier
                                                </span>
                                                <span className="text-sm text-gray-600 block mt-1">
                                                    ou glissez-déposez le fichier ici
                                                </span>
                                                <Input
                                                    id="logo"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoInputChange}
                                                    disabled={uploadingLogo}
                                                    className="hidden"
                                                />
                                            </Label>
                                            <p className="text-xs text-gray-500 mt-2">
                                                PNG, JPG, GIF jusqu'à 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {logoUrl && (
                                <div className="mt-4">
                                    <Label htmlFor="logo-replace" className="cursor-pointer">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingLogo}
                                            onClick={() => document.getElementById('logo-replace')?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {uploadingLogo ? 'Upload en cours...' : 'Remplacer le logo'}
                                        </Button>
                                    </Label>
                                    <Input
                                        id="logo-replace"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoInputChange}
                                        disabled={uploadingLogo}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <Label htmlFor="name">Nom de l'entreprise *</Label>
                                <Input
                                    id="name"
                                    value={supplierInfo.name}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, name: e.target.value })}
                                    placeholder="Nom de l'entreprise"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email personnel (connexion) *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={supplierInfo.email}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, email: e.target.value })}
                                    placeholder="email@exemple.com"
                                    required
                                    disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">Email utilisé pour votre compte et connexion</p>
                            </div>
                            <div>
                                <Label htmlFor="companyEmail">Email de l'entreprise</Label>
                                <Input
                                    id="companyEmail"
                                    type="email"
                                    value={supplierInfo.companyEmail || ''}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, companyEmail: e.target.value })}
                                    placeholder="contact@entreprise.com"
                                    disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">Cet email sera visible par les écoles. Si non renseigné, votre email personnel sera utilisé.</p>
                            </div>
                            <div>
                                <Label htmlFor="phone">Téléphone *</Label>
                                <Input
                                    id="phone"
                                    value={supplierInfo.phone}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, phone: e.target.value })}
                                    placeholder="819 123-4567"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="website">Site web</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={supplierInfo.website}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, website: e.target.value })}
                                    placeholder="https://www.exemple.com"
                                    disabled={loading}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="address">Adresse *</Label>
                                <Input
                                    id="address"
                                    value={supplierInfo.address}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, address: e.target.value })}
                                    placeholder="123 Rue Exemple"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="ville">Ville</Label>
                                <Input
                                    id="ville"
                                    value={supplierInfo.ville}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, ville: e.target.value })}
                                    placeholder="Montréal"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="codePostal">Code postal</Label>
                                <Input
                                    id="codePostal"
                                    value={supplierInfo.codePostal}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, codePostal: e.target.value })}
                                    placeholder="H1A 1A1"
                                    disabled={loading}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={supplierInfo.description}
                                    onChange={(e) => setSupplierInfo({ ...supplierInfo, description: e.target.value })}
                                    placeholder="Description de votre entreprise..."
                                    rows={4}
                                    className="resize-none"
                                    maxLength={1000}
                                    disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {supplierInfo.description.length}/1000 caractères
                                </p>
                            </div>
                        </div>

                        {/* Certifications */}
                        <div>
                            <Label>Certifications</Label>
                            <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                {supplierInfo.certifications.map((cert, index) => (
                                    <Badge key={index} variant="outline" className="text-sm">
                                        {cert}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCertification(index)}
                                            className="ml-2 hover:text-red-600"
                                            disabled={loading}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newCertification}
                                    onChange={(e) => setNewCertification(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCertification();
                                        }
                                    }}
                                    placeholder="Ajouter une certification"
                                    disabled={loading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAddCertification}
                                    disabled={!newCertification.trim() || loading}
                                >
                                    Ajouter
                                </Button>
                            </div>
                        </div>

                        {/* Visibility Toggle - Always visible, enabled only when onboarding is complete */}
                        <div className="pt-6 border-t-2 border-gray-200">
                            <div className={`flex items-center justify-between p-5 rounded-lg border-2 ${onboardingCompleted ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {supplierInfo.visibleInList && onboardingCompleted ? (
                                            <Eye className="w-6 h-6 text-blue-600" />
                                        ) : (
                                            <EyeOff className="w-6 h-6 text-gray-400" />
                                        )}
                                        <Label htmlFor="visibleInList" className={`text-lg font-bold ${onboardingCompleted ? 'text-gray-900 cursor-pointer' : 'text-gray-500 cursor-not-allowed'}`}>
                                            Afficher dans la liste des fournisseurs
                                        </Label>
                                    </div>
                                    <p className={`text-sm ml-9 ${onboardingCompleted ? 'text-gray-700' : 'text-gray-500'}`}>
                                        {supplierInfo.visibleInList && onboardingCompleted
                                            ? "✅ Votre entreprise est visible par les écoles lors de la création de campagnes."
                                            : "Votre entreprise ne sera pas visible dans la liste des fournisseurs. Les écoles ne pourront pas vous sélectionner pour leurs campagnes."
                                        }
                                    </p>
                                </div>
                                <div className="ml-4">
                                    <label className={`relative inline-flex items-center ${onboardingCompleted ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                        <input
                                            type="checkbox"
                                            id="visibleInList"
                                            checked={supplierInfo.visibleInList && onboardingCompleted}
                                            onChange={(e) => {
                                                if (onboardingCompleted) {
                                                    setSupplierInfo({ ...supplierInfo, visibleInList: e.target.checked });
                                                } else {
                                                    toast.error('Vous devez compléter votre onboarding avant de pouvoir apparaître dans la liste.');
                                                }
                                            }}
                                            disabled={loading || !onboardingCompleted}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-all ${onboardingCompleted
                                            ? supplierInfo.visibleInList
                                                ? 'bg-blue-600'
                                                : 'bg-gray-300'
                                            : 'bg-gray-300 opacity-50'
                                            } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600`}>
                                            <div className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-all shadow-md ${supplierInfo.visibleInList && onboardingCompleted ? 'translate-x-6' : 'translate-x-0'
                                                }`}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSaveInfo} disabled={savingInfo || loading}>
                                {savingInfo ? 'Enregistrement...' : 'Enregistrer les informations'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5" />
                            Paramètres de livraison
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* School Delivery Settings */}
                        <div className="border-b pb-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Livraison à l'école
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="pickupInstructions">Instructions pour le livreur</Label>
                                    <Textarea
                                        id="pickupInstructions"
                                        value={deliverySettings.pickupInstructions || ''}
                                        onChange={(e) => setDeliverySettings({
                                            ...deliverySettings,
                                            pickupInstructions: e.target.value
                                        })}
                                        placeholder="Ex: Entrer par la porte arrière, sonner à la réception, demander M. Dupont..."
                                        rows={4}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Instructions pour le livreur qui viendra chercher les produits à votre usine
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="minimumDeliveryDays">Délai minimum de livraison (jours) *</Label>
                                    <Input
                                        id="minimumDeliveryDays"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={deliverySettings.minimumDeliveryDays || 21}
                                        onChange={(e) => setDeliverySettings({
                                            ...deliverySettings,
                                            minimumDeliveryDays: parseInt(e.target.value) || 21
                                        })}
                                        placeholder="21"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Nombre minimum de jours entre la fin de la campagne et la date de livraison. Les écoles devront respecter ce délai lors de la création de campagnes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Direct to Consumer Settings */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Livraison directe au consommateur
                            </h3>
                            <div className="space-y-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={deliverySettings.directToConsumerEnabled}
                                        onChange={(e) => setDeliverySettings({
                                            ...deliverySettings,
                                            directToConsumerEnabled: e.target.checked
                                        })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium">
                                        Activer la livraison directe au consommateur
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500">
                                    Si activé, tous vos produits pourront être livrés directement au consommateur (ne passant pas par l'école).
                                    Cette option est obligatoire pour tous les produits si activée.
                                </p>
                                {deliverySettings.directToConsumerEnabled && (
                                    <>
                                        <div>
                                            <Label htmlFor="directToConsumerFee">Prix fixe par commande ($) *</Label>
                                            <Input
                                                id="directToConsumerFee"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={deliverySettings.directToConsumerFee === 0 ? '' : deliverySettings.directToConsumerFee}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                                                    setDeliverySettings({
                                                        ...deliverySettings,
                                                        directToConsumerFee: val === '' ? 0 : val
                                                    });
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value === '') {
                                                        setDeliverySettings({
                                                            ...deliverySettings,
                                                            directToConsumerFee: 0
                                                        });
                                                    }
                                                }}
                                                placeholder="0.00"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Prix fixe de livraison appliqué par commande (pas par produit) pour la livraison directe au consommateur
                                            </p>
                                        </div>
                                        <div>
                                            <Label htmlFor="directToConsumerRegion">Région couverte par la livraison *</Label>
                                            <Input
                                                id="directToConsumerRegion"
                                                type="text"
                                                value={deliverySettings.directToConsumerRegion || ''}
                                                onChange={(e) => setDeliverySettings({
                                                    ...deliverySettings,
                                                    directToConsumerRegion: e.target.value
                                                })}
                                                placeholder="Ex: Montréal, Laval, Longueuil..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Région(s) couverte(s) par votre service de livraison directe au consommateur
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleSave} disabled={saving || loading}>
                                {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Setup */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Configuration des paiements
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label htmlFor="chequeSpecimen" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Spécimen de chèque <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-xs text-gray-500 mb-4">
                                Uploadez un spécimen de chèque pour recevoir vos paiements. Ce document est requis pour finaliser votre configuration.
                            </p>

                            {chequeSpecimen && (
                                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-sm text-gray-700">Spécimen de chèque uploadé</span>
                                        </div>
                                        <a
                                            href={chequeSpecimen}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            Voir le fichier
                                        </a>
                                    </div>
                                    <img
                                        src={chequeSpecimen}
                                        alt="Spécimen de chèque"
                                        className="mt-3 max-h-48 max-w-full object-contain rounded border border-gray-300 bg-white p-2"
                                    />
                                    <div className="mt-4">
                                        <Label htmlFor="cheque-replace" className="cursor-pointer">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={uploadingCheque}
                                                onClick={() => document.getElementById('cheque-replace')?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                {uploadingCheque ? 'Upload en cours...' : 'Remplacer le spécimen'}
                                            </Button>
                                        </Label>
                                        <Input
                                            id="cheque-replace"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileInputChange}
                                            disabled={uploadingCheque}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            )}

                            {!chequeSpecimen && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors"
                                >
                                    {uploadingCheque ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            <p className="text-sm text-gray-600">Upload en cours...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <Label htmlFor="chequeSpecimen" className="cursor-pointer">
                                                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                                    Cliquez pour sélectionner un fichier
                                                </span>
                                                <span className="text-sm text-gray-600 block mt-1">
                                                    ou glissez-déposez le fichier ici
                                                </span>
                                                <Input
                                                    id="chequeSpecimen"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileInputChange}
                                                    disabled={uploadingCheque}
                                                    className="hidden"
                                                />
                                            </Label>
                                            <p className="text-xs text-gray-500 mt-2">
                                                PNG, JPG, GIF jusqu'à 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Team Management */}
                <SupplierTeamManagement />
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;


