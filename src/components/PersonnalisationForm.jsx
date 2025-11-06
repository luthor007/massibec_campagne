import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import BankGuides from '../components/BankGuides'
import OnboardingTooltip from './Dashboard/OnboardingTooltip'
import useOnboarding from '../hooks/useOnboarding'


import { Save, Percent, CheckCircle2, XCircle, AlertCircle, Loader2, School, ChevronDown, CheckCircle, Link as LinkIcon, Copy, ExternalLink, Plus, Trash2, Package } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
export default function PersonnalisationForm({ initialCampaignContext, hideCampaignSelector = false }) {
  const [isHovered, setIsHovered] = useState(false)
  const [user, setUser] = useState();
  const [formData, setFormData] = useState({
    nomBoutique: '',
    description: '',
    hoursAvailable: '',
    autoDeposit: true, // Default to true
    discountEnabled: true, // Default to true
    deliveryOptions: [
      { name: 'Travail', enabled: true },
      { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
      { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
      { name: 'Autre', enabled: true }
    ], // Default delivery options with new structure
  });
  const [campaigns, setCampaigns] = useState(initialCampaignContext?.campaigns || []); // User's campaigns - initialize from SSR
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaignContext?.activeCampaignId || null); // Currently selected campaign - initialize from SSR
  const router = useRouter();

  const [dateDeLivraison, setDateDeLivraison] = useState('');
  const [showEmailExample, setShowEmailExample] = useState(false);
  const [generatedStoreUrl, setGeneratedStoreUrl] = useState(null);

  // Onboarding state
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(null);
  const [tooltipTarget, setTooltipTarget] = useState(null);

  // Refs for tooltip positioning
  const nomBoutiqueRef = useRef(null);
  const descriptionRef = useRef(null);
  const autoDepositRef = useRef(null);
  const discountRef = useRef(null);
  const submitRef = useRef(null);

  // Use onboarding hook
  const {
    progress,
    currentStep,
    isLoading: onboardingLoading,
    markStepComplete,
    getStepContent
  } = useOnboarding();

  // Fetch campaigns first, then load store for selected campaign
  useEffect(() => {
    // Skip if we have initial campaigns from SSR
    if (initialCampaignContext?.campaigns && initialCampaignContext.campaigns.length > 0) {
      // Ensure selectedCampaignId is set if not already
      if (!selectedCampaignId && initialCampaignContext.activeCampaignId) {
        setSelectedCampaignId(initialCampaignContext.activeCampaignId);
      }
      return;
    }

    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/users/campaigns');
        if (response.ok) {
          const data = await response.json();
          if (data.campaigns && data.campaigns.length > 0) {
            setCampaigns(data.campaigns);
            // Set selected campaign to active campaign or first campaign
            const activeCampaign = data.campaigns.find(c => c._id === data.activeCampaignId) || data.campaigns[0];
            if (activeCampaign) {
              // Use _id as that's what the API returns for campaign ID
              const activeCampaignId = activeCampaign._id?.toString() || activeCampaign._id;
              setSelectedCampaignId(activeCampaignId);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des campagnes:', error);
      }
    };

    fetchCampaigns();

    // Listen for campaign changes from other components (like CampaignSelector)
    const handleCampaignSwitched = (event) => {
      const { campaignId } = event.detail;
      if (campaignId) {
        setSelectedCampaignId(campaignId.toString());
      }
    };

    window.addEventListener('campaignSwitched', handleCampaignSwitched);

    // Also listen for focus events to refresh campaign data when returning to the page
    const handleFocus = () => {
      fetchCampaigns();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('campaignSwitched', handleCampaignSwitched);
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialCampaignContext, selectedCampaignId]);

  // Fetch Store Data when selectedCampaignId changes
  useEffect(() => {
    if (!selectedCampaignId) return;

    // If we have initialStoreInfo from SSR, use it immediately
    if (initialCampaignContext?.initialStoreInfo?.deliveryOptions && initialCampaignContext.initialStoreInfo.campaignId === selectedCampaignId) {
      const normalizeDeliveryOptions = (options) => {
        if (!options || !Array.isArray(options)) {
          return [
            { name: 'Travail', enabled: true },
            { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
            { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
            { name: 'Autre', enabled: true }
          ];
        }

        if (typeof options[0] === 'string') {
          const migrationMap = {
            'Travail': { name: 'Travail', enabled: true },
            'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
            'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
            'Autre': { name: 'Autre', enabled: true }
          };
          return options.map(opt => migrationMap[opt] || { name: opt, enabled: true });
        }

        const validOptions = options.filter(opt => opt && opt.name);
        if (validOptions.length === 0) {
          return [
            { name: 'Travail', enabled: true },
            { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
            { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
            { name: 'Autre', enabled: true }
          ];
        }

        return validOptions.map(opt => ({
          name: opt.name || 'Autre',
          enabled: opt.enabled !== undefined ? opt.enabled : true,
          pickupAddress: opt.pickupAddress || '',
          deliveryRadius: opt.deliveryRadius || ''
        }));
      };

      setFormData(prev => ({
        ...prev,
        nomBoutique: initialCampaignContext.initialStoreInfo.name || '',
        description: initialCampaignContext.initialStoreInfo.description || '',
        autoDeposit: initialCampaignContext.initialStoreInfo.autoDeposit !== undefined ? initialCampaignContext.initialStoreInfo.autoDeposit : true,
        discountEnabled: initialCampaignContext.initialStoreInfo.discountEnabled !== undefined ? initialCampaignContext.initialStoreInfo.discountEnabled : true,
        deliveryOptions: normalizeDeliveryOptions(initialCampaignContext.initialStoreInfo.deliveryOptions),
      }));

      if (initialCampaignContext.initialStoreInfo.slug) {
        const fullUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/${initialCampaignContext.initialStoreInfo.slug}`
          : `/${initialCampaignContext.initialStoreInfo.slug}`;
        setGeneratedStoreUrl(fullUrl);
      }

      return; // Don't fetch if we have SSR data
    }

    const fetchStoreData = async () => {
      try {
        const response = await fetch(`/api/personnalisation?campaignId=${selectedCampaignId}`);
        if (response.ok) {
          const data = await response.json();

          // Normalize deliveryOptions to new format if needed
          const normalizeDeliveryOptions = (options) => {
            console.log('Normalizing deliveryOptions:', options);

            if (!options || !Array.isArray(options)) {
              console.log('No options or not an array, returning defaults');
              return [
                { name: 'Travail', enabled: true },
                { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                { name: 'Autre', enabled: true }
              ];
            }

            // If old format (strings), migrate
            if (typeof options[0] === 'string') {
              console.log('Migrating from string format');
              const migrationMap = {
                'Travail': { name: 'Travail', enabled: true },
                'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                'Autre': { name: 'Autre', enabled: true }
              };
              const migrated = options.map(opt => migrationMap[opt] || { name: opt, enabled: true });
              console.log('Migrated options:', migrated);
              return migrated;
            }

            // Already in new format, ensure all fields are present
            const normalized = options.map(opt => {
              // Skip if name is missing or empty
              if (!opt || !opt.name) {
                console.warn('Invalid delivery option found:', opt);
                return null;
              }
              return {
                name: opt.name,
                enabled: opt.enabled !== undefined ? opt.enabled : true,
                pickupAddress: opt.pickupAddress || '',
                deliveryRadius: opt.deliveryRadius || ''
              };
            }).filter(Boolean); // Remove null entries

            // Ensure we have at least the default options
            if (normalized.length === 0) {
              console.log('No valid options after normalization, returning defaults');
              return [
                { name: 'Travail', enabled: true },
                { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
                { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
                { name: 'Autre', enabled: true }
              ];
            }

            // Ensure "Autre" is always present
            const hasAutre = normalized.some(opt => opt.name === 'Autre');
            if (!hasAutre) {
              normalized.push({ name: 'Autre', enabled: true });
            }

            console.log('Normalized options:', normalized);
            return normalized;
          };

          setFormData(prevData => ({
            ...prevData,
            nomBoutique: data.name || prevData.nomBoutique,
            description: data.description || prevData.description,
            hoursAvailable: data.hoursAvailable || '',
            autoDeposit: data.autoDeposit !== false, // Default to true if not set
            discountEnabled: data.discountEnabled !== false, // Default to true if not set
            deliveryOptions: normalizeDeliveryOptions(data.deliveryOptions),
          }));

          // Set generated URL if store has a slug
          if (data.slug) {
            const fullUrl = typeof window !== 'undefined'
              ? `${window.location.origin}/${data.slug}`
              : `/${data.slug}`;
            setGeneratedStoreUrl(fullUrl);
          } else {
            // Clear URL if no slug exists yet
            setGeneratedStoreUrl(null);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données de la boutique:', error);
      }
    };

    fetchStoreData();
  }, [selectedCampaignId]);

  // Fetch user and delivery date
  useEffect(() => {
    const fetchUserAndDate = async () => {
      const session = await getSession();
      if (session) {
        setUser(session.user)

        // Fetch Delivery Date - only if school ID exists
        // For students, school might be in campaigns array, so we use the school-info API instead
        if (session.user.school) {
          try {
            const response = await fetch(`/api/schools/${session.user.school}`);
            if (response.ok) {
              const data = await response.json();
              setDateDeLivraison(data.dateDeLivraison);
            }
          } catch (error) {
            console.error('Erreur lors du chargement de la date de livraison:', error);
          }
        } else {
          // For students, try to get delivery date from campaign context
          // Skip school-info API as it requires school_manager role
          // Delivery date is optional and can be set later
        }

        // Set initial form data
        setFormData(prevData => ({
          ...prevData,
          nomBoutique: prevData.nomBoutique || `Campagne de ${session.user.name || ''}`,
          hoursAvailable: prevData.hoursAvailable || '',
          description: prevData.description || `🎉 Découvrez les pâtés exclusifs de la campagne de financement Massibec (viande et poulet) ainsi qu'un délicieux choix de tartes parfaites pour les fêtes qui approchent ! Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et contactez-moi pour connaître les modalités de récupération de vos produits. 🙏 Merci pour votre soutien et bon appétit !`,
        }))
      }
    }

    fetchUserAndDate()
  }, [])



  // Update description when delivery date is available (set default description if none exists)
  useEffect(() => {
    if (dateDeLivraison && (!formData.description || formData.description.trim() === '')) {
      const formatDate = (dateString) => {
        if (!dateString) return 'la date de livraison'
        const date = new Date(dateString)
        return date.toLocaleDateString('fr-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      const defaultDescription = `🎉 Découvrez les pâtés exclusifs de la campagne de financement Massibec (viande et poulet) ainsi qu'un délicieux choix de tartes parfaites pour les fêtes qui approchent ! Chaque achat soutient directement nos activités scolaires ! 📚 Commandez dès maintenant et, si vous ne le savez pas encore, contactez-moi pour connaître les modalités de récupération de vos produits le ${formatDate(dateDeLivraison)}. 🙏 Merci pour votre soutien et bon appétit !`

      setFormData(prevData => ({
        ...prevData,
        description: defaultDescription
      }))
    }
  }, [dateDeLivraison, formData.description])

  // Onboarding logic for personalization form
  useEffect(() => {
    if (!onboardingLoading && currentStep?.key === 'personalizedStore') {
      setCurrentOnboardingStep(currentStep);
      setShowOnboardingTooltip(true);

      // Start with the first field (nomBoutique)
      setTooltipTarget(nomBoutiqueRef.current);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading]);

  // Onboarding handlers
  const handleOnboardingNext = async () => {
    if (currentOnboardingStep?.key === 'personalizedStore') {
      // Move to next field in the personalization form
      if (tooltipTarget === nomBoutiqueRef.current) {
        setTooltipTarget(descriptionRef.current);
      } else if (tooltipTarget === descriptionRef.current) {
        setTooltipTarget(autoDepositRef.current);
      } else if (tooltipTarget === autoDepositRef.current) {
        setTooltipTarget(discountRef.current);
      } else if (tooltipTarget === discountRef.current) {
        setTooltipTarget(submitRef.current);
      } else if (tooltipTarget === submitRef.current) {
        // Complete the personalization step
        const success = await markStepComplete('personalizedStore', true);
        if (success) {
          setShowOnboardingTooltip(false);
        }
      }
    }
  };

  const handleOnboardingSkip = async () => {
    if (currentOnboardingStep?.key === 'personalizedStore') {
      const success = await markStepComplete('personalizedStore', true);
      if (success) {
        setShowOnboardingTooltip(false);
      }
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingTooltip(false);
  };

  // Get onboarding content for personalization fields
  const getPersonalizationStepContent = () => {
    if (tooltipTarget === nomBoutiqueRef.current) {
      return {
        title: "Nom de votre boutique",
        message: "Entrez le nom qui apparaîtra sur votre boutique.",
        tip: null,
        stats: null,
        benefit: null
      };
    } else if (tooltipTarget === descriptionRef.current) {
      return {
        title: "Description de votre boutique",
        message: "Décrivez vos produits et votre cause.",
        tip: null,
        stats: null,
        benefit: null
      };
    } else if (tooltipTarget === autoDepositRef.current) {
      return {
        title: "Dépôts automatiques",
        message: "Activez si votre banque accepte les dépôts Interac automatiques.",
        tip: null,
        stats: null,
        benefit: null
      };
    } else if (tooltipTarget === discountRef.current) {
      return {
        title: "Réductions automatiques",
        message: "Offrez 5% de rabais dès 6 produits. Réduit votre profit mais booste les ventes.",
        tip: null,
        stats: null,
        benefit: null
      };
    } else if (tooltipTarget === submitRef.current) {
      return {
        title: "Enregistrer",
        message: "Cliquez pour sauvegarder votre boutique.",
        tip: null,
        stats: null,
        benefit: null
      };
    }
    return {};
  };

  // Helper function to get discount suggestion
  const getDiscountSuggestion = () => {
    if (formData.discountEnabled) {
      return "💡 Suggestion: Vous pourriez ajouter 'Économisez plus en achetant plus : 5% de rabais dès 6 produits !' à votre description pour informer vos clients de la réduction.";
    }
    return "";
  }

  const [newDeliveryOption, setNewDeliveryOption] = useState('')

  const handleAddDeliveryOption = () => {
    if (newDeliveryOption.trim()) {
      const optionName = newDeliveryOption.trim();
      // Check if option already exists
      const exists = formData.deliveryOptions.some(opt => opt.name === optionName);
      if (!exists) {
        const updatedOptions = [
          ...formData.deliveryOptions.filter(opt => opt.name !== 'Autre'),
          { name: optionName, enabled: true },
          ...formData.deliveryOptions.filter(opt => opt.name === 'Autre')
        ];
        setFormData({ ...formData, deliveryOptions: updatedOptions });
        setNewDeliveryOption('');
      }
    }
  }

  const handleRemoveDeliveryOption = (optionNameToRemove) => {
    // Don't allow removing "Autre"
    if (optionNameToRemove === 'Autre') return;

    const updatedOptions = formData.deliveryOptions
      .filter(opt => opt.name !== optionNameToRemove)
      .map(opt => {
        // Ensure "Autre" is always present
        if (opt.name === 'Autre') {
          return { ...opt, enabled: true };
        }
        return opt;
      });

    // Ensure "Autre" is present
    const hasAutre = updatedOptions.some(opt => opt.name === 'Autre');
    if (!hasAutre) {
      updatedOptions.push({ name: 'Autre', enabled: true });
    }

    setFormData({ ...formData, deliveryOptions: updatedOptions });
  }

  const handleToggleDeliveryOption = (optionName) => {
    // Don't allow disabling "Autre"
    if (optionName === 'Autre') return;

    const updatedOptions = formData.deliveryOptions.map(opt => {
      if (opt.name === optionName) {
        return { ...opt, enabled: !opt.enabled };
      }
      return opt;
    });
    setFormData({ ...formData, deliveryOptions: updatedOptions });
  }

  const handleUpdateDeliveryOptionName = (oldName, newName) => {
    // Don't allow renaming "Autre", "Livraison", or "Pickup"
    if (oldName === 'Autre' || oldName.includes('Livraison') || oldName.includes('Pickup')) return;

    // Don't allow empty names
    if (!newName.trim()) return;

    // Don't allow duplicate names
    const hasDuplicate = formData.deliveryOptions.some(opt => opt.name === newName.trim() && opt.name !== oldName);
    if (hasDuplicate) return;

    const updatedOptions = formData.deliveryOptions.map(opt => {
      if (opt.name === oldName) {
        return { ...opt, name: newName.trim() };
      }
      return opt;
    });
    setFormData({ ...formData, deliveryOptions: updatedOptions });
  }

  const handleUpdateDeliveryOptionField = (optionName, field, value) => {
    const updatedOptions = formData.deliveryOptions.map(opt => {
      if (opt.name === optionName) {
        return { ...opt, [field]: value };
      }
      return opt;
    });
    setFormData({ ...formData, deliveryOptions: updatedOptions });
  }

  const handleChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  }

  const handleCampaignChange = async (campaignId) => {
    if (!campaignId) {
      console.error('handleCampaignChange called with undefined campaignId');
      return;
    }
    const normalizedCampaignId = campaignId.toString();

    // Switch active campaign in the database (same as CampaignSelector does)
    try {
      const response = await fetch('/api/campaigns/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: normalizedCampaignId })
      });

      if (response.ok) {
        // Update local state
        setSelectedCampaignId(normalizedCampaignId);

        // Dispatch custom event to notify other components (like CampaignSelector)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campaignSwitched', {
            detail: { campaignId: normalizedCampaignId }
          }));
        }
      } else {
        console.error('Failed to switch campaign');
        toast.error('Erreur lors du changement de campagne');
      }
    } catch (error) {
      console.error('Error switching campaign:', error);
      toast.error('Erreur lors du changement de campagne');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCampaignId) {
      toast.error('Veuillez sélectionner une campagne');
      return;
    }

    try {
      const session = await getSession();

      const response = await fetch('/api/personnalisation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          name: formData.nomBoutique,
          description: formData.description,
          hoursAvailable: formData.hoursAvailable,
          autoDeposit: formData.autoDeposit,
          discountEnabled: formData.discountEnabled,
          deliveryOptions: formData.deliveryOptions,
          campaignId: selectedCampaignId, // Send campaignId to identify which store to update
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data)

        // Store the generated URL
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${data.storeUrl}` : data.storeUrl;
        setGeneratedStoreUrl(fullUrl);

        // Mark personalization step as complete
        await markStepComplete('personalizedStore', true);

        // Redirect directly to the store without toasts
        router.push(data.storeUrl);

        // Mark visitedStore as complete after a short delay to ensure page is loaded
        setTimeout(async () => {
          await markStepComplete('visitedStore', true);
        }, 1000);
      } else {
        const error = await response.json();
        const errorMessage = error.message || 'Erreur lors de la personnalisation';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue lors de l\'enregistrement de la personnalisation');
    }
  };

  // Définition du composant EmailExample
  // components/EmailTemplate.tsx



  const EmailExample = () => {
    // Example customer data (these remain as examples since they're for a fictional customer)
    const firstName = "Jean";
    const customerEmail = "jean@example.com";

    // Real data from form and user
    const storeName = formData.nomBoutique || "Boutique de Pâtés";
    const hoursAvailable = formData.hoursAvailable || "14h00 - 16h00";
    const sellerName = user?.name || "Votre Nom";

    // Get phone number from various possible locations based on user role
    let sellerPhone = null;
    if (user) {
      // Check root level telephone field
      if (user.telephone) {
        sellerPhone = user.telephone;
      }
      // For students, check parentInfo.telephone
      else if (user.parentInfo?.telephone) {
        sellerPhone = user.parentInfo.telephone;
      }
      // For school managers, check schoolManagerInfo
      else if (user.schoolManagerInfo?.cellulaire) {
        sellerPhone = user.schoolManagerInfo.cellulaire;
      }
      else if (user.schoolManagerInfo?.telephone) {
        sellerPhone = user.schoolManagerInfo.telephone;
      }
      // Legacy phone field
      else if (user.phone) {
        sellerPhone = user.phone;
      }
    }
    sellerPhone = sellerPhone || "Non disponible";

    const sellerEmail = user?.email || "votre.email@example.com";

    // Format delivery date
    const formatDate = (dateString) => {
      if (!dateString) return 'la date de livraison';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateString;
      }
    };

    // Get delivery date from campaign or school
    const deliveryDateValue = activeCampaign?.deliveryDate
      || activeCampaign?.school?.dateDeLivraison
      || dateDeLivraison
      || null;

    const deliveryDate = deliveryDateValue ? formatDate(deliveryDateValue) : "08/12/2024";

    // Get delivery location from active campaign's school
    const deliveryLocation = activeCampaign?.school?.address
      || activeCampaign?.school?.distributionLocation
      || "123 rue xyz";
    const deliveryCity = activeCampaign?.school?.ville || "LaVille";

    // Format campaign end date for order deadline
    const formatDateShort = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateString;
      }
    };

    const orderDeadline = activeCampaign?.endDate
      ? formatDateShort(activeCampaign.endDate)
      : activeCampaign?.finCampagne
        ? formatDateShort(activeCampaign.finCampagne)
        : "29/10/2024";

    // Example products (these remain as examples)
    const products = [
      {
        productId: "1",
        productName: "Pâté à la viande",
        quantity: 2,
        price: 10.00,
        amount: "20,00 $",
      },
      {
        productId: "2",
        productName: "Pâté au poulet",
        quantity: 3,
        price: 10.00,
        amount: "30,00 $",
      },
    ];
    const totalAmount = 50.00;
    // Get donation configuration from campaign
    const studentDonationsEnabled = activeCampaign?.donationsForStudents?.enabled !== false;
    const schoolDonationsEnabled = activeCampaign?.donationsForSchool?.enabled !== false;

    // Example donations based on campaign configuration
    const studentDonation = studentDonationsEnabled ? 5.00 : 0;
    const schoolDonation = schoolDonationsEnabled ? 2.00 : 0;
    const orderId = "12345";
    const orderDate = new Date().toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
        <h2 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Confirmation de votre commande - Commande #{orderId}</h2>

        <p>Merci <strong>{firstName}</strong> pour votre commande.</p>
        <p>La livraison se fera le <strong>{deliveryDate}</strong> et les produits vous seront donc acheminés tel que nous avons personnellement convenu.</p>

        <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Transfert Interac</h3>
        <p>Pour finaliser votre commande, merci d'effectuer le transfert Interac à :</p>
        <p>
          <strong>Destinataire :</strong> {sellerName}<br />
          <strong>Adresse courriel :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a><br />
          {formData.autoDeposit ? null : <><strong>Question de sécurité :</strong> {firstName}<br /></>}
          {formData.autoDeposit ? null : <><strong>Réponse :</strong> <a href={`mailto:${customerEmail}`}>{customerEmail}</a><br /></>}
          <strong>Montant :</strong> {totalAmount.toFixed(2)} $<br />
          {formData.autoDeposit ? <><strong>Message :</strong> #{orderId}</> : null}
        </p>

        <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Détails de la commande :</h3>
        <p><strong>Nom du vendeur :</strong> {sellerName}</p>
        <p><strong>Numéro de téléphone du vendeur :</strong> {sellerPhone}</p>
        <p><strong>Email du vendeur :</strong> <a href={`mailto:${sellerEmail}`}>{sellerEmail}</a></p>
        <p><strong>Numéro de commande :</strong> #{orderId}</p>
        <p><strong>Date de la commande :</strong> {orderDate}</p>

        <h3>Produits commandés :</h3>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', minWidth: '300px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'left' }}>Produit</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'center' }}>Qté</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'right' }}>Prix</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'right' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px' }}>{item.productName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'right' }}>${item.price.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '14px', textAlign: 'right' }}>${item.amount}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>Total des unités :</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontSize: '14px' }}>
                  {products.reduce((acc, item) => acc + item.quantity, 0)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>Nombre de caisses :</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontSize: '14px' }}>
                  {(products.reduce((acc, item) => acc + item.quantity * 0.17, 0)).toFixed(2)}
                </td>
              </tr>
              {(studentDonation > 0 || schoolDonation > 0) && (
                <>
                  {studentDonation > 0 && (
                    <tr>
                      <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>Dons élèves :</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontSize: '14px' }}>
                        ${studentDonation.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {schoolDonation > 0 && (
                    <tr>
                      <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>Dons école :</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontSize: '14px' }}>
                        ${schoolDonation.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </>
              )}
              <tr>
                <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>Total à payer :</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontSize: '14px' }}>
                  ${(totalAmount + studentDonation + schoolDonation).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Merci de votre soutien, et si vous souhaitez ajouter des produits, vous avez jusqu'au <strong>{orderDeadline}</strong> pour envoyer votre commande et paiement.
        </p>

        <p>
          Merci encore.
        </p>
      </div>
    );
  };


  // Get active campaign for display
  const activeCampaign = campaigns.find(c => {
    const cId = c._id?.toString() || c._id;
    return cId === selectedCampaignId;
  }) || campaigns.find(c => c.isActiveCampaign) || campaigns[0];

  return (
    <>
      {/* Campaign Selector - Top Right */}
      {!hideCampaignSelector && campaigns.length > 1 && (
        <div className="flex justify-end mb-4 sm:mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto sm:min-w-[240px] sm:max-w-[320px] justify-between bg-white hover:bg-gray-50 border-gray-300 shadow-sm h-auto py-2 sm:py-2.5 px-3 text-sm sm:text-base"
              >
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  {activeCampaign?.school?.logo ? (
                    <img
                      src={activeCampaign.school.logo}
                      alt={activeCampaign.school.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <School className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
                      {activeCampaign?.school?.name || 'Aucune campagne'}
                    </div>
                    <div className="text-xs sm:text-xs text-gray-500 mt-0.5">
                      Campagne #{activeCampaign?.campaignNumber || 'N/A'}
                      {activeCampaign?.isActive && ' • Active'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 bg-white border border-gray-200 shadow-xl rounded-xl z-[80]">
              <div className="p-3 border-b border-gray-200 bg-white">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Mes Campagnes</h3>
                <p className="text-xs sm:text-sm text-gray-500">{campaigns.length} campagne(s)</p>
              </div>

              <div className="max-h-64 overflow-y-auto bg-white">
                {campaigns.map((campaign) => {
                  // Use _id as campaign identifier (from API response)
                  const campaignId = campaign._id?.toString() || campaign._id;
                  if (!campaignId) {
                    console.warn('Campaign without _id:', campaign);
                    return null;
                  }
                  const isSelected = campaignId === selectedCampaignId;
                  return (
                    <DropdownMenuItem
                      key={campaignId}
                      onClick={() => handleCampaignChange(campaignId)}
                      className={`p-2 sm:p-3 cursor-pointer bg-white hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          {campaign?.school?.logo ? (
                            <img
                              src={campaign.school.logo}
                              alt={campaign.school.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                              <School className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                                {campaign?.school?.name || 'École inconnue'}
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1">
                              Campagne #{campaign?.campaignNumber || 'N/A'} • {campaign?.campaignCode || ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
        {/* Header Section */}

        <div
          ref={nomBoutiqueRef}
          className="space-y-2"
        >
          <Label htmlFor="nomBoutique" className="text-sm sm:text-base font-semibold text-gray-900">
            Nom de la boutique
          </Label>
          <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
            Ce nom apparaîtra sur votre boutique et dans les emails envoyés à vos clients.
          </p>
          <Input
            type="text"
            id="nomBoutique"
            name="nomBoutique"
            value={formData.nomBoutique}
            onChange={handleChange}
            required
            className={`mt-1 text-sm sm:text-base ${tooltipTarget === nomBoutiqueRef.current ? 'ring-4 ring-blue-500 border-blue-500' : ''}`}
            placeholder="Entrez le nom de votre boutique"
          />
        </div>

        <div
          ref={descriptionRef}
          className="space-y-2"
        >
          <Label htmlFor="description" className="text-sm sm:text-base font-semibold text-gray-900">
            Description
          </Label>
          <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
            Décrivez vos produits et votre cause. Cette description apparaîtra sur votre page de boutique pour aider vos clients à comprendre votre campagne.
          </p>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={6}
            className={`mt-1 text-sm sm:text-base ${tooltipTarget === descriptionRef.current ? 'ring-4 ring-blue-500 border-blue-500' : ''}`}
            placeholder="Décrivez vos produits et votre cause..."
          />
        </div>
        {/* Tip for Automatic Deposits */}
        <div className="mt-4 sm:mt-6 p-4 sm:p-5 border border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">
                💡 Configuration des dépôts automatiques
              </p>
              <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                Pensez à configurer vos dépôts automatiques pour faciliter la gestion de vos fonds. Vous pouvez le faire avec les guides ci-dessous.
              </p>
            </div>
          </div>
        </div>

        {/* Bank Guides Component */}
        <BankGuides />

        <div
          ref={autoDepositRef}
          className="space-y-3 sm:space-y-4 p-2 sm:p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${tooltipTarget === autoDepositRef.current ? 'ring-4 ring-blue-500 rounded-lg p-2 -m-2' : ''}`}>
            <div className="space-y-1 flex-1 min-w-0">
              <Label htmlFor="autoDeposit" className="text-sm sm:text-base font-semibold text-gray-900">
                Dépôts automatiques
              </Label>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Activez cette option si votre compte bancaire est configuré pour recevoir les dépôts automatiques Interac. Cela simplifie le processus de paiement pour vos clients.
              </p>
            </div>
            <Toggle
              id="autoDeposit"
              pressed={formData.autoDeposit}
              onPressedChange={(pressed) => setFormData({ ...formData, autoDeposit: pressed })}
              aria-label="Activer les dépôts automatiques"
              size="sm"
              variant="outline"
              className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=on]:border-green-600 data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 data-[state=off]:border-gray-300 w-full sm:w-auto sm:min-w-[100px] h-10"
            >
              {formData.autoDeposit ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Oui
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Non
                </>
              )}
            </Toggle>
          </div>
        </div>

        <div
          ref={discountRef}
          className="space-y-3 sm:space-y-4 p-2 sm:p-6 border-2 border-blue-200 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${tooltipTarget === discountRef.current ? 'ring-4 ring-blue-500 rounded-lg p-2 -m-2' : ''}`}>
            <div className="space-y-1 flex-1 min-w-0">
              <Label htmlFor="discountEnabled" className="text-sm sm:text-base font-semibold text-blue-900 flex items-center gap-2">
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Réductions automatiques</span>
              </Label>
              <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                {formData.discountEnabled
                  ? "5% de réduction automatique dès 6 produits commandés. Les réductions sont déduites du profit du compte scolaire puis du profit comptant."
                  : "Les réductions sont désactivées pour cette boutique. Activez-les pour encourager les commandes groupées."}
              </p>
            </div>
            <Toggle
              id="discountEnabled"
              pressed={formData.discountEnabled}
              onPressedChange={(pressed) => setFormData({ ...formData, discountEnabled: pressed })}
              aria-label="Activer les réductions automatiques"
              size="sm"
              variant="outline"
              className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=on]:border-green-600 data-[state=off]:bg-gray-200 data-[state=off]:text-gray-700 data-[state=off]:border-gray-300 w-full sm:w-auto sm:min-w-[100px] h-10"
            >
              {formData.discountEnabled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Oui
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Non
                </>
              )}
            </Toggle>
          </div>
        </div>

        {/* Delivery Options Section */}
        <div className="space-y-4 sm:space-y-6 p-2 sm:p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="space-y-1">
            <Label className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Options de livraison</span>
            </Label>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Configurez les options de livraison disponibles pour vos clients lors du checkout.
            </p>
          </div>

          {/* Delivery Options List - Organized by type */}
          <div className="space-y-4 sm:space-y-6 mt-4">
            {/* Livraison Option */}
            {formData.deliveryOptions.find(opt => opt.name.includes('Livraison')) && (() => {
              const option = formData.deliveryOptions.find(opt => opt.name.includes('Livraison'));
              return (
                <Card key="livraison" className="border-2 border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base font-semibold text-blue-900 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Livraison (si près de chez moi)
                      </CardTitle>
                      <Toggle
                        pressed={option.enabled}
                        onPressedChange={() => handleToggleDeliveryOption(option.name)}
                        aria-label={`${option.enabled ? 'Désactiver' : 'Activer'} Livraison`}
                        size="sm"
                        className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-400"
                      >
                        {option.enabled ? 'Actif' : 'Inactif'}
                      </Toggle>
                    </div>
                  </CardHeader>
                  {option.enabled && (
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs sm:text-sm text-gray-700 font-medium">Rayon de livraison</Label>
                        <Input
                          type="text"
                          placeholder="Ex: G0X1C0"
                          value={option.deliveryRadius || ''}
                          onChange={(e) => handleUpdateDeliveryOptionField(option.name, 'deliveryRadius', e.target.value)}
                          className="text-sm w-full bg-white"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })()}

            {/* Pickup Option */}
            {formData.deliveryOptions.find(opt => opt.name.includes('Pickup')) && (() => {
              const option = formData.deliveryOptions.find(opt => opt.name.includes('Pickup'));
              return (
                <Card key="pickup" className="border-2 border-green-200 bg-green-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base font-semibold text-green-900 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Pickup (chez moi)
                      </CardTitle>
                      <Toggle
                        pressed={option.enabled}
                        onPressedChange={() => handleToggleDeliveryOption(option.name)}
                        aria-label={`${option.enabled ? 'Désactiver' : 'Activer'} Pickup`}
                        size="sm"
                        className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-400"
                      >
                        {option.enabled ? 'Actif' : 'Inactif'}
                      </Toggle>
                    </div>
                  </CardHeader>
                  {option.enabled && (
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs sm:text-sm text-gray-700 font-medium">Adresse de pickup (domicile)</Label>
                        <Input
                          type="text"
                          placeholder="Ex: 123 rue Principale, Québec, QC G1A 1A1"
                          value={option.pickupAddress || ''}
                          onChange={(e) => handleUpdateDeliveryOptionField(option.name, 'pickupAddress', e.target.value)}
                          className="text-sm w-full bg-white"
                        />
                        <p className="text-xs text-gray-600">Cette adresse sera affichée aux clients qui choisissent cette option</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })()}

            {/* Separator for custom options */}
            {formData.deliveryOptions.filter(opt => !opt.name.includes('Livraison') && !opt.name.includes('Pickup') && opt.name !== 'Autre').length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700">Autres options personnalisées</Label>
                  <p className="text-xs text-gray-500">Options que vous avez créées</p>
                </div>
              </>
            )}

            {/* Custom Options (not Livraison, Pickup, or Autre) */}
            {formData.deliveryOptions
              .filter(opt => !opt.name.includes('Livraison') && !opt.name.includes('Pickup') && opt.name !== 'Autre')
              .map((option, index) => (
                <Card key={`custom-${index}`} className="border border-gray-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                        <Input
                          type="text"
                          value={option.name}
                          onChange={(e) => handleUpdateDeliveryOptionName(option.name, e.target.value)}
                          className="text-sm sm:text-base font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full sm:flex-1"
                          placeholder="Nom de l'option"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                        <Toggle
                          pressed={option.enabled}
                          onPressedChange={() => handleToggleDeliveryOption(option.name)}
                          aria-label={`${option.enabled ? 'Désactiver' : 'Activer'} ${option.name}`}
                          size="sm"
                          className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=off]:bg-gray-200 data-[state=off]:text-gray-400"
                        >
                          {option.enabled ? 'Actif' : 'Inactif'}
                        </Toggle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDeliveryOption(option.name)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}

            {/* Separator for Autre */}
            <Separator className="my-4" />

            {/* Autre Option */}
            {formData.deliveryOptions.find(opt => opt.name === 'Autre') && (() => {
              const option = formData.deliveryOptions.find(opt => opt.name === 'Autre');
              return (
                <Card key="autre" className="border-2 border-gray-300 bg-gray-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Autre
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded font-normal">Toujours activé</span>
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                      Permet aux clients d'écrire une option personnalisée lors du checkout
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })()}
          </div>

          {/* Add New Option */}
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-gray-700">Ajouter une nouvelle option</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="Ex: École, Gare, Travail, etc."
                value={newDeliveryOption}
                onChange={(e) => setNewDeliveryOption(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddDeliveryOption()
                  }
                }}
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddDeliveryOption}
                disabled={!newDeliveryOption.trim() || formData.deliveryOptions.some(opt => opt.name === newDeliveryOption.trim())}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        <div
          ref={submitRef}
          className="pt-4 sm:pt-6"
        >
          <Button
            variant="default"
            size="lg"
            type="submit"
            className={`
              w-full
              relative overflow-hidden transition-all duration-300 ease-out
              transform hover:scale-105 hover:shadow-lg active:scale-95
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
              text-white font-semibold py-5 sm:py-6 px-6 sm:px-8 text-sm sm:text-base
              rounded-xl shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
              ${tooltipTarget === submitRef.current ? 'ring-4 ring-blue-500' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span
              className="relative z-10 flex items-center justify-center space-x-2"
              style={{
                transform: isHovered ? 'translateX(5px)' : 'none',
                transition: 'transform 0.2s'
              }}
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="whitespace-nowrap">Enregistrer et créer ma boutique</span>
            </span>
            <div
              className="absolute inset-0 bg-white"
              style={{
                borderRadius: '0.75rem',
                zIndex: 0,
                transform: isHovered ? 'scale(1.5)' : 'scale(0)',
                opacity: isHovered ? 0.15 : 0,
                transition: 'transform 0.3s, opacity 0.3s'
              }}
            />
          </Button>
        </div>
      </form>

      {/* Onboarding Tooltip */}
      {showOnboardingTooltip && currentOnboardingStep && tooltipTarget && (
        <OnboardingTooltip
          isVisible={showOnboardingTooltip}
          position="right"
          title={getPersonalizationStepContent().title}
          message={getPersonalizationStepContent().message}
          tip={getPersonalizationStepContent().tip}
          stats={getPersonalizationStepContent().stats}
          benefit={getPersonalizationStepContent().benefit}
          onNext={handleOnboardingNext}
          onSkip={handleOnboardingSkip}
          onClose={handleOnboardingClose}
          currentStep={currentOnboardingStep.order}
          totalSteps={6}
          showCelebration={false}
          targetElement={tooltipTarget}
        />
      )}



      <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
          Prévisualisation de l'email
        </h3>
        <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">
          Voici un exemple de courriel qui sera envoyé à vos clients lorsqu'ils passeront une commande. Les informations comme les dons dépendront de la configuration de votre campagne.
        </p>
        <Button
          onClick={() => setShowEmailExample(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
        >
          Voir un exemple de courriel
        </Button>
      </div>

      {/* Popup */}
      {showEmailExample && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '10px',
          }}
          className="p-2 sm:p-5"
          onClick={() => setShowEmailExample(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '700px',
              marginTop: '10px',
              marginBottom: '10px',
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflowY: 'auto',
            }}
            className="sm:p-6 sm:mt-5 sm:mb-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Exemple de courriel de confirmation</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Voici ce que vos clients recevront après avoir passé une commande
                </p>
              </div>
              {/* Bouton pour fermer le popup */}
              <button
                onClick={() => setShowEmailExample(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 self-end sm:self-auto"
                aria-label="Fermer"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {/* Contenu de l'exemple de courriel */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 overflow-x-auto">
              <EmailExample />
            </div>
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
              <Button
                onClick={() => setShowEmailExample(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base py-2.5 sm:py-3"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}