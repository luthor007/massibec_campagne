import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Mail, Lock, User, ArrowRight, Sparkles, Info, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackSupplierRegistrationStarted, trackSupplierRegistrationStep, trackSupplierRegistrationCompleted } from '@/lib/funnelAnalytics';

export default function SupplierInscriptionForm({ skipVerification = false }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [emailExists, setEmailExists] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailValid, setEmailValid] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [passwordValid, setPasswordValid] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [currentStep, setCurrentStep] = useState(1);
    const hasTrackedStarted = useRef(false);
    const totalSteps = 3; // Account, Website, Company Info
    const [isScraping, setIsScraping] = useState(false);
    const [scrapingError, setScrapingError] = useState('');
    const [formData, setFormData] = useState({
        // Step 1: Account Info
        nomComplet: '',
        email: '',
        motDePasse: '',
        confirmationMotDePasse: '',
        // Step 2: Website (optional)
        website: '',
        // Step 3: Company Info (pre-filled if scraping successful)
        nomEntreprise: '',
        telephone: '',
        companyEmail: '', // Email de l'entreprise (différent de l'email personnel)
        adresse: '',
        ville: '',
        codePostal: '',
        description: '',
        logo: null,
        logoUrl: null // URL du logo scrapé
    });

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files[0] || null }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Track registration started on first interaction
        if (!hasTrackedStarted.current) {
            hasTrackedStarted.current = true;
            trackSupplierRegistrationStarted();
        }
    };

    // Email validation
    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = formData.email ? emailRegex.test(formData.email) : false;
        setEmailValid(isValid);

        const checkEmail = async () => {
            if (formData.email && isValid) {
                setIsCheckingEmail(true);
                try {
                    const response = await fetch('/api/check-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: formData.email })
                    });
                    const data = await response.json();
                    setEmailExists(data.exists);
                } catch (error) {
                    console.error('Error checking email:', error);
                } finally {
                    setIsCheckingEmail(false);
                }
            } else {
                setEmailExists(false);
            }
        };

        const timeoutId = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    // Password match validation
    useEffect(() => {
        if (formData.confirmationMotDePasse) {
            const match = formData.motDePasse === formData.confirmationMotDePasse && formData.motDePasse.length > 0;
            setPasswordsMatch(match);
        } else {
            setPasswordsMatch(false);
        }
    }, [formData.motDePasse, formData.confirmationMotDePasse]);

    // Password strength validation
    useEffect(() => {
        const valid = formData.motDePasse ? formData.motDePasse.length >= 6 : false;
        setPasswordValid(valid);
    }, [formData.motDePasse]);

    // Field validation on change
    useEffect(() => {
        const errors = {};

        // Step 1 fields
        if (currentStep === 1) {
            if (formData.nomComplet && formData.nomComplet.trim().length === 0) {
                errors.nomComplet = 'Le nom complet est requis';
            }
            if (formData.email) {
                if (!emailValid) {
                    errors.email = 'Format d\'email invalide';
                } else if (emailExists) {
                    errors.email = 'Cette adresse e-mail est déjà utilisée';
                }
            }
            if (formData.motDePasse && !passwordValid) {
                errors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
            }
            if (formData.confirmationMotDePasse && !passwordsMatch) {
                errors.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
            }
        }

        // Step 3 fields
        if (currentStep === 3) {
            if (formData.nomEntreprise && formData.nomEntreprise.trim().length === 0) {
                errors.nomEntreprise = 'Le nom de l\'entreprise est requis';
            }
            if (formData.telephone && formData.telephone.trim().length === 0) {
                errors.telephone = 'Le téléphone est requis';
            }
            if (formData.adresse && formData.adresse.trim().length === 0) {
                errors.adresse = 'L\'adresse est requise';
            }
        }

        setFieldErrors(errors);
    }, [formData, currentStep, emailValid, emailExists, passwordValid, passwordsMatch]);

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!formData.nomComplet || !formData.email || !formData.motDePasse || !formData.confirmationMotDePasse) {
                    return 'Veuillez remplir tous les champs requis.';
                }
                if (formData.motDePasse !== formData.confirmationMotDePasse) {
                    return 'Les mots de passe ne correspondent pas.';
                }
                if (emailExists) {
                    return 'Cette adresse e-mail est déjà utilisée.';
                }
                if (formData.motDePasse.length < 6) {
                    return 'Le mot de passe doit contenir au moins 6 caractères.';
                }
                return null;
            case 2:
                // Website step is optional, no validation needed
                return null;
            case 3:
                if (!formData.nomEntreprise || !formData.telephone || !formData.adresse) {
                    return 'Veuillez remplir tous les champs requis (nom d\'entreprise, téléphone, adresse).';
                }
                return null;
            default:
                return null;
        }
    };

    const nextStep = async () => {
        const error = validateStep(currentStep);
        if (error) {
            setErrorMessage(error);
            return;
        }
        setErrorMessage('');
        setScrapingError('');

        // If moving from step 2 (website) to step 3 (company info), check cache first, then scrape if needed
        if (currentStep === 2 && formData.website && formData.website.trim()) {
            setIsScraping(true);
            try {
                // First, check cache for faster pre-fill (only if caching is enabled)
                // The API will handle the cache check internally, but we can also check explicitly
                const cacheResponse = await fetch(`/api/supplier/get-scraping-cache?websiteUrl=${encodeURIComponent(formData.website.trim())}`);

                if (cacheResponse.ok) {
                    const cacheData = await cacheResponse.json();
                    if (cacheData.success && cacheData.cached && cacheData.data) {
                        // Use cached data immediately
                        const companyInfo = cacheData.data.companyInfo || {};

                        // Parse address (same logic as below)
                        let ville = '';
                        let codePostal = '';
                        let adresse = companyInfo.address || '';

                        if (adresse) {
                            const postalCodeMatch = adresse.match(/\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i);
                            if (postalCodeMatch) {
                                codePostal = postalCodeMatch[1].replace(/\s/g, '').toUpperCase();
                                adresse = adresse.replace(postalCodeMatch[0], '').trim();
                            }

                            const parts = adresse.split(',').map(p => p.trim()).filter(p => p.length > 0);

                            if (parts.length >= 2) {
                                const lastPart = parts[parts.length - 1];
                                const isCountry = lastPart.match(/^(Canada|CA|États-Unis|USA|United States)$/i);

                                if (isCountry && parts.length >= 3) {
                                    const provincePart = parts[parts.length - 2];
                                    const provinceCityMatch = provincePart.match(/^(.+?)\s+(QC|Quebec|ON|Ontario|BC|British Columbia|AB|Alberta)$/i);
                                    if (provinceCityMatch) {
                                        ville = provinceCityMatch[1].trim();
                                        adresse = parts.slice(0, -2).join(', ');
                                    } else {
                                        if (parts.length >= 4) {
                                            ville = parts[parts.length - 3];
                                            adresse = parts.slice(0, -3).join(', ');
                                        } else {
                                            ville = parts[parts.length - 2];
                                            adresse = parts.slice(0, -2).join(', ');
                                        }
                                    }
                                } else if (parts.length >= 2) {
                                    const lastPart = parts[parts.length - 1];
                                    const isProvince = lastPart.match(/^(QC|Quebec|ON|Ontario|BC|British Columbia|AB|Alberta)$/i);

                                    if (isProvince && parts.length >= 3) {
                                        ville = parts[parts.length - 2];
                                        adresse = parts.slice(0, -2).join(', ');
                                    } else {
                                        const cityProvinceMatch = lastPart.match(/^(.+?)\s+(QC|Quebec|ON|Ontario|BC|British Columbia|AB|Alberta)$/i);
                                        if (cityProvinceMatch) {
                                            ville = cityProvinceMatch[1].trim();
                                            adresse = parts.slice(0, -1).join(', ');
                                        } else {
                                            ville = lastPart;
                                            adresse = parts.slice(0, -1).join(', ');
                                        }
                                    }
                                }
                            }

                            adresse = adresse.replace(/,\s*$/, '').trim();
                            adresse = adresse.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, '').trim();
                            adresse = adresse.replace(/,\s*$/, '').trim();

                            if (ville) {
                                ville = ville.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, '').trim();
                            }
                        }

                        setFormData(prev => ({
                            ...prev,
                            nomEntreprise: companyInfo.name || prev.nomEntreprise,
                            telephone: companyInfo.phone || prev.telephone,
                            adresse: adresse || prev.adresse,
                            ville: ville || prev.ville,
                            codePostal: codePostal || prev.codePostal,
                            description: companyInfo.description || prev.description,
                            logoUrl: companyInfo.logo || null
                        }));

                        // If cache is fresh, skip scraping and go to next step
                        if (cacheData.isFresh) {
                            setIsScraping(false);
                            setCurrentStep(3);
                            return;
                        }
                        // If cache exists but is stale, continue to scraping to update it
                        // But we've already pre-filled with cached data, so user can proceed
                    }
                }

                // If no cache or cache is stale, proceed with scraping to get fresh data
                const response = await fetch('/api/supplier/scrape-website', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        websiteUrl: formData.website.trim(),
                        useGemini: true // Use Gemini by default (more intelligent)
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        // Pre-fill company info from scraped data
                        const companyInfo = data.data.companyInfo || {};

                        // Parse address to extract city and postal code
                        // Expected format: "Street Address, City, Province PostalCode, Country"
                        // or: "Street Address, City, Province, PostalCode, Country"
                        let ville = '';
                        let codePostal = '';
                        let adresse = companyInfo.address || '';

                        if (adresse) {
                            // First, extract postal code (Canadian format: A1A 1A1 or A1A1A1)
                            const postalCodeMatch = adresse.match(/\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i);
                            if (postalCodeMatch) {
                                codePostal = postalCodeMatch[1].replace(/\s/g, '').toUpperCase();
                                // Remove postal code from address string
                                adresse = adresse.replace(postalCodeMatch[0], '').trim();
                            }

                            // Split by comma to parse address components
                            const parts = adresse.split(',').map(p => p.trim()).filter(p => p.length > 0);

                            if (parts.length >= 2) {
                                // Common Canadian formats:
                                // "123 St, Montreal, QC, Canada" -> parts: [street, city, province, country]
                                // "123 St, Montreal QC, Canada" -> parts: [street, "Montreal QC", country]

                                // Check if last part is country
                                const lastPart = parts[parts.length - 1];
                                const isCountry = lastPart.match(/^(Canada|CA|États-Unis|USA|United States)$/i);

                                if (isCountry && parts.length >= 3) {
                                    // Format: Street, City, Province, Country
                                    // City is second to last, province is before that
                                    const provincePart = parts[parts.length - 2];
                                    // Check if province contains city (e.g., "Montreal QC")
                                    const provinceCityMatch = provincePart.match(/^(.+?)\s+(QC|Quebec|ON|Ontario|BC|British Columbia|AB|Alberta)$/i);
                                    if (provinceCityMatch) {
                                        ville = provinceCityMatch[1].trim();
                                        adresse = parts.slice(0, -2).join(', ');
                                    } else {
                                        // City is third to last, province is second to last
                                        if (parts.length >= 4) {
                                            ville = parts[parts.length - 3];
                                            adresse = parts.slice(0, -3).join(', ');
                                        } else {
                                            ville = parts[parts.length - 2];
                                            adresse = parts.slice(0, -2).join(', ');
                                        }
                                    }
                                } else if (parts.length >= 2) {
                                    // Format without country: "Street, City, Province"
                                    // Check if last part is province
                                    const lastPart = parts[parts.length - 1];
                                    const isProvince = lastPart.match(/^(QC|Quebec|ON|Ontario|BC|British Columbia|AB|Alberta)$/i);

                                    if (isProvince && parts.length >= 3) {
                                        // City is second to last
                                        ville = parts[parts.length - 2];
                                        adresse = parts.slice(0, -2).join(', ');
                                    } else {
                                        // Check if last part contains city and province (e.g., "Montreal QC")
                                        const cityProvinceMatch = lastPart.match(/^(.+?)\s+(QC|Quebec|ON|Ontario|BC|British Columbia|AB|Alberta)$/i);
                                        if (cityProvinceMatch) {
                                            ville = cityProvinceMatch[1].trim();
                                            adresse = parts.slice(0, -1).join(', ');
                                        } else {
                                            // Last part is likely the city
                                            ville = lastPart;
                                            adresse = parts.slice(0, -1).join(', ');
                                        }
                                    }
                                }
                            }

                            // Clean up address (remove trailing commas, extra spaces)
                            adresse = adresse.replace(/,\s*$/, '').trim();

                            // Remove postal code if it's still in the address
                            adresse = adresse.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, '').trim();

                            // Final cleanup
                            adresse = adresse.replace(/,\s*$/, '').trim();

                            // Ensure ville doesn't contain postal code
                            if (ville) {
                                ville = ville.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, '').trim();
                            }
                        }

                        setFormData(prev => ({
                            ...prev,
                            nomEntreprise: companyInfo.name || prev.nomEntreprise,
                            telephone: companyInfo.phone || prev.telephone,
                            adresse: adresse || prev.adresse,
                            ville: ville || prev.ville,
                            codePostal: codePostal || prev.codePostal,
                            description: companyInfo.description || prev.description,
                            // Note: logo URL cannot be directly set in file input, but we can show it
                            logoUrl: companyInfo.logo || null // Store logo URL for display
                        }));
                    }
                } else {
                    const errorData = await response.json();
                    setScrapingError(errorData.message || 'Erreur lors du scraping');
                    // Continue anyway - user can fill manually
                }
            } catch (error) {
                console.error('Error scraping website:', error);
                setScrapingError('Erreur lors du scraping. Vous pouvez continuer et remplir manuellement.');
                // Continue anyway - user can fill manually
            } finally {
                setIsScraping(false);
            }
        }

        if (currentStep < totalSteps) {
            // Track step completion
            trackSupplierRegistrationStep(currentStep);
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setErrorMessage('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // If not on the final step, just advance to next step instead of showing error
        if (currentStep !== totalSteps) {
            nextStep();
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        // Final validation
        const error = validateStep(currentStep);
        if (error) {
            setErrorMessage(error);
            setIsSubmitting(false);
            return;
        }

        try {
            // Create FormData for file upload
            const formDataToSend = new FormData();

            // Add all form fields (including website and logoUrl)
            Object.keys(formData).forEach(key => {
                if (key !== 'logo' && key !== 'logoUrl' && formData[key] !== null && formData[key] !== '') {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Add logo file if present (takes priority over logoUrl)
            if (formData.logo) {
                formDataToSend.append('logo', formData.logo);
            } else if (formData.logoUrl) {
                // If no file uploaded, use scraped logo URL
                formDataToSend.append('logoUrl', formData.logoUrl);
            }

            // Add skipVerification flag if present
            if (skipVerification) {
                formDataToSend.append('skipVerification', 'true');
            }

            const response = await fetch('/api/inscription-supplier', {
                method: 'POST',
                body: formDataToSend,
            });

            if (response.ok) {
                const data = await response.json();

                // Track registration completion
                trackSupplierRegistrationCompleted(formData.email);

                toast.success('Compte créé avec succès!');

                // If skipVerification is true, auto-login and redirect to dashboard
                if (skipVerification) {
                    try {
                        // Automatically sign in the user
                        const result = await signIn('credentials', {
                            redirect: false,
                            email: formData.email,
                            password: formData.motDePasse,
                        });

                        if (result?.error) {
                            console.error('Auto-login error:', result.error);
                            // If auto-login fails, redirect to login page
                            toast.error('Compte créé. Veuillez vous connecter.');
                            router.push('/connexion');
                        } else if (result?.ok) {
                            // Successfully logged in, redirect to dashboard
                            router.push('/dashboard-supplier');
                        }
                    } catch (loginError) {
                        console.error('Error during auto-login:', loginError);
                        // If auto-login fails, redirect to login page
                        toast.error('Compte créé. Veuillez vous connecter.');
                        router.push('/connexion');
                    }
                } else {
                    // Store email for email verification
                    sessionStorage.setItem('pendingVerificationEmail', formData.email.toLowerCase().trim());
                    // Redirect to email verification page
                    router.push('/email-verification');
                }
            } else {
                let errorMessage = 'Erreur lors de la création du compte';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                    // Log the full error for debugging
                    console.error('Inscription error:', errorData);
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                    errorMessage = `Erreur ${response.status}: ${response.statusText}`;
                }
                setErrorMessage(errorMessage);
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage('Erreur de connexion. Veuillez réessayer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="nomComplet" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Nom complet <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="nomComplet"
                                    name="nomComplet"
                                    type="text"
                                    value={formData.nomComplet}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.nomComplet ? 'border-red-500' : formData.nomComplet ? 'border-green-500' : ''}`}
                                />
                                {formData.nomComplet && !fieldErrors.nomComplet && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            {fieldErrors.nomComplet && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.nomComplet}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Email <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.email ? 'border-red-500' : (formData.email && emailValid && !emailExists) ? 'border-green-500' : ''}`}
                                />
                                {isCheckingEmail && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                                {!isCheckingEmail && formData.email && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        {fieldErrors.email || emailExists ? (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                        ) : emailValid ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : null}
                                    </div>
                                )}
                            </div>
                            {fieldErrors.email && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="motDePasse" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Mot de passe <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="motDePasse"
                                    name="motDePasse"
                                    type="password"
                                    value={formData.motDePasse}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.motDePasse ? 'border-red-500' : (formData.motDePasse && passwordValid) ? 'border-green-500' : ''}`}
                                />
                                {formData.motDePasse && !fieldErrors.motDePasse && passwordValid && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            {fieldErrors.motDePasse && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.motDePasse}</p>
                            )}
                            {formData.motDePasse && !passwordValid && (
                                <p className="text-sm text-gray-500 mt-1">Le mot de passe doit contenir au moins 6 caractères</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="confirmationMotDePasse" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Confirmer le mot de passe <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmationMotDePasse"
                                    name="confirmationMotDePasse"
                                    type="password"
                                    value={formData.confirmationMotDePasse}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.confirmationMotDePasse ? 'border-red-500' : (formData.confirmationMotDePasse && passwordsMatch) ? 'border-green-500' : ''}`}
                                />
                                {formData.confirmationMotDePasse && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        {passwordsMatch ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {fieldErrors.confirmationMotDePasse && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.confirmationMotDePasse}</p>
                            )}
                            {formData.confirmationMotDePasse && !passwordsMatch && !fieldErrors.confirmationMotDePasse && (
                                <p className="text-sm text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                            )}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-start">
                                <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                                <p className="text-sm text-blue-800">
                                    Fournissez l'URL de votre site web pour que nous puissions automatiquement extraire vos informations et produits. Ce champ est optionnel.
                                </p>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="website" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Site web
                            </Label>
                            <Input
                                id="website"
                                name="website"
                                type="url"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://www.example.com"
                                className="w-full"
                            />
                        </div>
                        {isScraping && (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-2"></div>
                                <span className="text-sm text-gray-600">Récupération des informations en cours...</span>
                            </div>
                        )}
                        {scrapingError && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                                <p className="text-sm">{scrapingError}</p>
                            </div>
                        )}
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="nomEntreprise" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Nom de l'entreprise <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="nomEntreprise"
                                    name="nomEntreprise"
                                    type="text"
                                    value={formData.nomEntreprise}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.nomEntreprise ? 'border-red-500' : (formData.nomEntreprise && !fieldErrors.nomEntreprise) ? 'border-green-500' : ''}`}
                                />
                                {formData.nomEntreprise && !fieldErrors.nomEntreprise && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            {fieldErrors.nomEntreprise && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.nomEntreprise}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="telephone" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Téléphone <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="telephone"
                                    name="telephone"
                                    type="tel"
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.telephone ? 'border-red-500' : (formData.telephone && !fieldErrors.telephone) ? 'border-green-500' : ''}`}
                                />
                                {formData.telephone && !fieldErrors.telephone && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            {fieldErrors.telephone && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.telephone}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="companyEmail" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Email de l'entreprise
                            </Label>
                            <div className="relative">
                                <Input
                                    id="companyEmail"
                                    name="companyEmail"
                                    type="email"
                                    value={formData.companyEmail}
                                    onChange={handleChange}
                                    placeholder="contact@entreprise.com"
                                    className={`w-full ${fieldErrors.companyEmail ? 'border-red-500' : (formData.companyEmail && !fieldErrors.companyEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail)) ? 'border-green-500' : ''}`}
                                />
                                {formData.companyEmail && !fieldErrors.companyEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail) && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Cet email sera visible par les écoles. Si non renseigné, votre email personnel sera utilisé.
                            </p>
                            {fieldErrors.companyEmail && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.companyEmail}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="adresse" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Adresse <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="adresse"
                                    name="adresse"
                                    type="text"
                                    value={formData.adresse}
                                    onChange={handleChange}
                                    required
                                    className={`w-full ${fieldErrors.adresse ? 'border-red-500' : (formData.adresse && !fieldErrors.adresse) ? 'border-green-500' : ''}`}
                                />
                                {formData.adresse && !fieldErrors.adresse && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            {fieldErrors.adresse && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.adresse}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="ville" className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Ville
                                </Label>
                                <Input
                                    id="ville"
                                    name="ville"
                                    type="text"
                                    value={formData.ville}
                                    onChange={handleChange}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="codePostal" className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Code postal
                                </Label>
                                <Input
                                    id="codePostal"
                                    name="codePostal"
                                    type="text"
                                    value={formData.codePostal}
                                    onChange={handleChange}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Description de l'entreprise
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <Label htmlFor="logo" className="text-sm font-semibold text-gray-700 mb-2 block">
                                Logo de l'entreprise
                            </Label>
                            {formData.logoUrl && (
                                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs text-gray-600 mb-2">Logo trouvé sur le site web:</p>
                                    <img
                                        src={formData.logoUrl}
                                        alt="Logo scrapé"
                                        className="max-h-20 max-w-48 object-contain"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Vous pouvez télécharger un autre logo si nécessaire</p>
                                </div>
                            )}
                            <Input
                                id="logo"
                                name="logo"
                                type="file"
                                accept="image/*"
                                onChange={handleChange}
                                className="w-full"
                            />
                            {formData.logo && (
                                <p className="text-sm text-gray-600 mt-2">Fichier sélectionné: {formData.logo.name}</p>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Inscription Fournisseur
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Rejoignez la marketplace Jappuie et connectez-vous avec des écoles
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center flex-1">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= step
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'border-gray-300 text-gray-400'
                                    }`}>
                                    {currentStep > step ? (
                                        <CheckCircle className="h-6 w-6" />
                                    ) : (
                                        <span>{step}</span>
                                    )}
                                </div>
                                {step < 3 && (
                                    <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-purple-600' : 'bg-gray-300'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Compte</span>
                        <span>Site web</span>
                        <span>Entreprise</span>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {renderStepContent()}

                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                            >
                                Précédent
                            </Button>
                            {currentStep < totalSteps ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    Suivant
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {isSubmitting ? 'Création...' : 'Créer mon compte'}
                                </Button>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>
                            Déjà un compte?{' '}
                            <Link href="/connexion" className="text-purple-600 hover:underline">
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

