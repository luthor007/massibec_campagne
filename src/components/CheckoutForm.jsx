// components/CheckoutForm.jsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, CreditCard, Mail, Phone, User, DollarSign, Copy, Check, PartyPopper, AlertCircle } from 'lucide-react'
import { getTerminology } from '@/utils/organizationHelpers'
import { trackPaymentCompleted } from '@/lib/analytics'

export default function CheckoutForm({ total, originalTotal, discount = 0, discountAmount = 0, onClose, items, removeAllItem, campaignId, schoolId, storeId, initialCampaignData, initialDeliveryOptions, isExample = false }) {
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    phoneNumber: '',
  })
  const [deliveryOptions, setDeliveryOptions] = useState(initialDeliveryOptions || [])
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState('')
  const [customDeliveryOption, setCustomDeliveryOption] = useState('')
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [deliveryRadiusMap, setDeliveryRadiusMap] = useState({}) // Store delivery radius for each option
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerSchool, setOwnerSchool] = useState('')
  const [ownerId, setOwnerId] = useState(null)
  const [owner, setOwner] = useState(null)
  const [isLoadingOwner, setIsLoadingOwner] = useState(!initialCampaignData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [showMerciAnimation, setShowMerciAnimation] = useState(false)
  const merciTimeoutRef = useRef(null)

  // Separate donation states
  const [studentDonation, setStudentDonation] = useState(0)
  const [customStudentDonation, setCustomStudentDonation] = useState('')
  const [schoolDonation, setSchoolDonation] = useState(0)
  const [customSchoolDonation, setCustomSchoolDonation] = useState('')

  // StoreId can come from props or router query
  const [storeIdFromRouter, setStoreIdFromRouter] = useState(null)
  const finalStoreId = storeId || storeIdFromRouter
  const [autoDeposit, setAutoDeposit] = useState()
  const [campaign, setCampaign] = useState(initialCampaignData || null)

  // Use campaignId from props if available, otherwise fetch from store API
  const [finalCampaignId, setFinalCampaignId] = useState(campaignId)
  const [finalSchoolId, setFinalSchoolId] = useState(schoolId)

  // School and campaign data for distribution message
  const [schoolAddress, setSchoolAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [orderId, setOrderId] = useState('')
  const [copiedField, setCopiedField] = useState(null)
  const [savedFinalTotal, setSavedFinalTotal] = useState(null)
  const [schoolOrganizationType, setSchoolOrganizationType] = useState(null)

  // Calculate final total including donations - recalculate when any value changes
  const finalTotal = useMemo(() => {
    const baseTotal = total || 0
    const studentDonationAmount = typeof studentDonation === 'number' ? studentDonation : (parseFloat(customStudentDonation) || 0)
    const schoolDonationAmount = typeof schoolDonation === 'number' ? schoolDonation : (parseFloat(customSchoolDonation) || 0)
    const donations = studentDonationAmount + schoolDonationAmount
    const calculated = baseTotal + donations
    // Save the total when it's calculated (before cart is emptied)
    if (calculated > 0 && !savedFinalTotal) {
      setSavedFinalTotal(calculated)
    }
    return calculated
  }, [total, studentDonation, customStudentDonation, schoolDonation, customSchoolDonation, savedFinalTotal])

  // Use saved total in success modal, fallback to calculated total
  const displayTotal = savedFinalTotal || finalTotal

  // Get terminology based on organization type
  const organizationType = campaign?.organizationType || schoolOrganizationType || 'school'
  const terminology = getTerminology(organizationType)

  const router = useRouter()

  // Update finalCampaignId and finalSchoolId when props change
  useEffect(() => {
    if (campaignId) {
      setFinalCampaignId(campaignId)
    }
    if (schoolId) {
      setFinalSchoolId(schoolId)
    }
  }, [campaignId, schoolId])

  // Use initialCampaignData if provided (from SSR)
  useEffect(() => {
    if (initialCampaignData) {
      // Ensure donations config has defaults if not set
      const campaignWithDefaults = {
        ...initialCampaignData,
        donationsForStudents: initialCampaignData.donationsForStudents || {
          enabled: true,
          presets: [0, 2, 5]
        },
        donationsForSchool: initialCampaignData.donationsForSchool || {
          enabled: true,
          presets: [0, 2, 5]
        }
      }
      setCampaign(campaignWithDefaults)
      setIsLoadingOwner(false)
    }
  }, [initialCampaignData])

  // Use initialDeliveryOptions from SSR if available
  useEffect(() => {
    if (initialDeliveryOptions && initialDeliveryOptions.length > 0) {
      const normalizeDeliveryOptions = (options) => {
        if (!options || !Array.isArray(options)) {
          return [];
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
        return validOptions.map(opt => ({
          name: opt.name || 'Autre',
          enabled: opt.enabled !== undefined ? opt.enabled : true,
          pickupAddress: opt.pickupAddress || '',
          deliveryRadius: opt.deliveryRadius || ''
        }));
      };

      const normalizedOptions = normalizeDeliveryOptions(initialDeliveryOptions);
      const enabledOptions = normalizedOptions.filter(opt => opt.enabled);
      setDeliveryOptions(enabledOptions);

      // Store pickup address and delivery radius from all options
      const pickupOption = normalizedOptions.find(opt => opt.name === 'Pickup (chez moi)');
      if (pickupOption && pickupOption.pickupAddress) {
        setPickupAddress(pickupOption.pickupAddress);
      }

      const radiusMap = {};
      normalizedOptions.forEach(opt => {
        if (opt.deliveryRadius) {
          radiusMap[opt.name] = opt.deliveryRadius;
        }
      });
      setDeliveryRadiusMap(radiusMap);
    }
  }, [initialDeliveryOptions]);

  const fetchOwnerInfo = useCallback(async (storeId) => {
    if (!storeId) {
      console.warn('CheckoutForm: No storeId provided to fetchOwnerInfo')
      return
    }

    try {
      setIsLoadingOwner(true)
      console.log('CheckoutForm: Fetching store data for:', storeId)
      const response = await fetch(`/api/stores/${storeId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('CheckoutForm: Store data received:', { campaignId: data.campaignId, ownerSchool: data.ownerSchool })
        setOwnerEmail(data.ownerEmail)
        setOwnerSchool(data.ownerSchool)
        setOwnerId(data.ownerId)
        setOwner(data.owner)
        setAutoDeposit(data.autoDeposit)

        // Normalize and filter deliveryOptions
        const normalizeDeliveryOptions = (options) => {
          if (!options || !Array.isArray(options)) {
            return [];
          }

          // If old format (strings), migrate
          if (typeof options[0] === 'string') {
            const migrationMap = {
              'Travail': { name: 'Travail', enabled: true },
              'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
              'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
              'Autre': { name: 'Autre', enabled: true }
            };
            return options.map(opt => migrationMap[opt] || { name: opt, enabled: true });
          }

          // Already in new format
          return options.map(opt => ({
            name: opt.name || 'Autre',
            enabled: opt.enabled !== undefined ? opt.enabled : true,
            pickupAddress: opt.pickupAddress || '',
            deliveryRadius: opt.deliveryRadius || ''
          }));
        };

        const normalizedOptions = normalizeDeliveryOptions(data.deliveryOptions);
        // Filter to only show enabled options
        const enabledOptions = normalizedOptions.filter(opt => opt.enabled);
        setDeliveryOptions(enabledOptions);

        // Store pickup address and delivery radius from all options (not just enabled ones)
        const pickupOption = normalizedOptions.find(opt => opt.name === 'Pickup (chez moi)');
        if (pickupOption && pickupOption.pickupAddress) {
          setPickupAddress(pickupOption.pickupAddress);
        }

        // Store delivery radius map for all options
        const radiusMap = {};
        normalizedOptions.forEach(opt => {
          if (opt.deliveryRadius) {
            radiusMap[opt.name] = opt.deliveryRadius;
          }
        });
        setDeliveryRadiusMap(radiusMap);

        // Use campaignId from props if available, otherwise use from API
        // Priority: props > API data
        const campaignIdToUse = campaignId || data.campaignId
        if (campaignIdToUse) {
          setFinalCampaignId(campaignIdToUse)
        }

        // Use schoolId from props if available, otherwise use from API
        const schoolIdToUse = schoolId || data.ownerSchool
        if (schoolIdToUse) {
          setFinalSchoolId(schoolIdToUse)
        }

        // Use campaignId from API (data.campaignId) directly - it's the most reliable source
        // Don't rely on finalCampaignId state which may not be updated yet
        const campaignIdFromStore = campaignId || data.campaignId || null

        // If no campaignId yet, try to get from owner (fallback)
        let campaignIdToLoad = campaignIdFromStore
        if (!campaignIdToLoad && data.owner) {
          // Try to get activeCampaignId from owner
          if (data.owner.activeCampaignId) {
            campaignIdToLoad = data.owner.activeCampaignId
            // Update finalCampaignId for consistency
            setFinalCampaignId(campaignIdToLoad)
          } else if (data.owner.campaigns && data.owner.campaigns.length > 0) {
            // Fallback: find active campaign from campaigns array
            const activeCampaign = data.owner.campaigns.find(c => c.isActive) || data.owner.campaigns[0]
            if (activeCampaign) {
              campaignIdToLoad = activeCampaign.campaignId || activeCampaign._id
              // Update finalCampaignId for consistency
              setFinalCampaignId(campaignIdToLoad)
            }
          }
        } else if (campaignIdToLoad) {
          // Ensure finalCampaignId state is updated
          setFinalCampaignId(campaignIdToLoad)
        }

        console.log('CheckoutForm: CampaignId to load:', campaignIdToLoad)

        // Only fetch campaign if we don't already have it from props
        if (campaignIdToLoad && !initialCampaignData) {
          try {
            console.log('CheckoutForm: Fetching campaign data for:', campaignIdToLoad)
            const campaignResponse = await fetch(`/api/campaigns/${campaignIdToLoad}`)
            if (campaignResponse.ok) {
              const campaignData = await campaignResponse.json()
              // API returns { campaign: {...} }, so extract the campaign object
              const campaign = campaignData.campaign || campaignData
              console.log('CheckoutForm: Campaign loaded for donations:', campaign)
              console.log('CheckoutForm: Donations enabled - Students:', campaign.donationsForStudents?.enabled, 'School:', campaign.donationsForSchool?.enabled)
              // Ensure donations config has defaults if not set (but don't override existing false values)
              if (campaign) {
                // Only set defaults if donationsForStudents doesn't exist or is null/undefined
                if (!campaign.donationsForStudents || campaign.donationsForStudents === null || campaign.donationsForStudents === undefined) {
                  campaign.donationsForStudents = {
                    enabled: true,
                    presets: [0, 5, 10, 20]
                  }
                } else {
                  // Ensure enabled is boolean (keep false if explicitly set to false)
                  if (campaign.donationsForStudents.enabled === undefined || campaign.donationsForStudents.enabled === null) {
                    campaign.donationsForStudents.enabled = true
                  }
                  // Ensure presets exist and are arrays
                  if (!campaign.donationsForStudents.presets || !Array.isArray(campaign.donationsForStudents.presets) || campaign.donationsForStudents.presets.length === 0) {
                    campaign.donationsForStudents.presets = [0, 5, 10, 20]
                  }
                }

                // Only set defaults if donationsForSchool doesn't exist or is null/undefined
                if (!campaign.donationsForSchool || campaign.donationsForSchool === null || campaign.donationsForSchool === undefined) {
                  campaign.donationsForSchool = {
                    enabled: true,
                    presets: [0, 5, 10, 20]
                  }
                } else {
                  // Ensure enabled is boolean (keep false if explicitly set to false)
                  if (campaign.donationsForSchool.enabled === undefined || campaign.donationsForSchool.enabled === null) {
                    campaign.donationsForSchool.enabled = true
                  }
                  // Ensure presets exist and are arrays
                  if (!campaign.donationsForSchool.presets || !Array.isArray(campaign.donationsForSchool.presets) || campaign.donationsForSchool.presets.length === 0) {
                    campaign.donationsForSchool.presets = [0, 5, 10, 20]
                  }
                }

                // Store delivery date for distribution message
                if (campaign.deliveryDate) {
                  setDeliveryDate(campaign.deliveryDate);
                }
              }
              setCampaign(campaign)

              // Fetch school address if we have schoolId
              if (finalSchoolId) {
                try {
                  const schoolResponse = await fetch(`/api/schools/${finalSchoolId}`);
                  if (schoolResponse.ok) {
                    const schoolData = await schoolResponse.json();
                    if (schoolData.address) {
                      setSchoolAddress(schoolData.address);
                    }
                    if (schoolData.organizationType) {
                      setSchoolOrganizationType(schoolData.organizationType);
                    }
                  }
                } catch (error) {
                  console.error('Error fetching school address:', error);
                }
              }
              console.log('Campaign loaded for donations:', campaign)
              console.log('Donations enabled - Students:', campaign.donationsForStudents?.enabled, 'School:', campaign.donationsForSchool?.enabled)
            }
          } catch (error) {
            console.error('Error fetching campaign:', error)
          }
        } else {
          // Campaign might be loaded from props or other sources, this is not always an error
          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.debug('No active campaign found for owner, using campaignId from props:', campaignId)
          }
        }
      } else {
        console.error('Erreur lors de la récupération des données de la boutique')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoadingOwner(false)
    }
  }, [campaignId, schoolId])

  useEffect(() => {
    if (!router.isReady) return

    // Always fetch owner info when storeId is available (from props or router)
    // This ensures data is loaded even for non-logged-in users
    const storeIdToFetch = storeId || storeIdFromRouter || router.query?.id || router.query?.slug

    if (storeIdToFetch) {
      // If storeId prop changed, update from router
      if (!storeId && router.query?.id) {
        setStoreIdFromRouter(router.query.id)
      }
      fetchOwnerInfo(storeIdToFetch)
    }
  }, [router.isReady, router.query, storeId, fetchOwnerInfo, storeIdFromRouter])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Student donation handlers
  const handleStudentDonationChange = (value) => {
    if (value === 'custom') {
      setStudentDonation('custom')
      // Keep customStudentDonation value if it exists, otherwise set to empty
      if (!customStudentDonation) {
        setCustomStudentDonation('')
      }
    } else {
      setStudentDonation(parseFloat(value))
      setCustomStudentDonation('')
    }
  }

  const handleCustomStudentDonationChange = (e) => {
    const value = e.target.value
    setCustomStudentDonation(value)
    const numValue = parseFloat(value) || 0
    setStudentDonation(numValue)
  }

  // School donation handlers
  const handleSchoolDonationChange = (value) => {
    if (value === 'custom') {
      setSchoolDonation('custom')
      // Keep customSchoolDonation value if it exists, otherwise set to empty
      if (!customSchoolDonation) {
        setCustomSchoolDonation('')
      }
    } else {
      setSchoolDonation(parseFloat(value))
      setCustomSchoolDonation('')
    }
  }

  const handleCustomSchoolDonationChange = (e) => {
    const value = e.target.value
    setCustomSchoolDonation(value)
    const numValue = parseFloat(value) || 0
    setSchoolDonation(numValue)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    // Prevent submission in example mode
    if (isExample) {
      toast.error('Cette boutique est un exemple. Les commandes ne peuvent pas être passées ici.')
      return
    }

    if (!owner || !owner._id) {
      toast.error('Informations du propriétaire non disponibles. Veuillez réessayer plus tard.')
      return
    }

    // Check if school or campaign is available
    if (!finalSchoolId && !finalCampaignId) {
      toast.error('Aucune école ou campagne associée à votre boutique. Veuillez vous assurer que vous êtes bien associé à une campagne active ou contactez le support.')
      return
    }

    // Validate delivery option
    if (deliveryOptions && deliveryOptions.length > 0 && !selectedDeliveryOption) {
      toast.error('Veuillez sélectionner une option de livraison.')
      return
    }

    if (selectedDeliveryOption === 'Autre' && !customDeliveryOption.trim()) {
      toast.error('Veuillez préciser votre option de livraison personnalisée.')
      return
    }

    // Validate delivery address if "Livraison" is selected
    const selectedOption = deliveryOptions.find(opt => opt.name === selectedDeliveryOption);
    if (selectedOption && selectedOption.name === 'Livraison (si près de chez moi)' && !customerDeliveryAddress.trim()) {
      toast.error('Veuillez fournir votre adresse de livraison.')
      return
    }

    console.log("----------OWNER FROM CHECKOUT----------")
    console.log(owner)
    console.log("----------OWNER SCHOOL FROM CHECKOUT----------")
    console.log(ownerSchool || finalSchoolId)
    console.log("----------CAMPAIGN ID FROM CHECKOUT----------")
    console.log(finalCampaignId)

    setIsSubmitting(true)

    try {
      // Create postData BEFORE removing items from cart
      const postData = {
        products: items.map(item => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
          name: item.name,
        })),
        totalAmount: total, // Only products amount, donations are sent separately
        customerEmail: formData.email,
        customerName: formData.nom,
        phoneNumber: formData.phoneNumber,
        storeId: finalStoreId,
        school: ownerSchool || finalSchoolId, // Use finalSchoolId if ownerSchool not set
        campaignId: finalCampaignId, // Campaign-based: pass campaignId directly
        owner: owner,
        studentDonation: typeof studentDonation === 'number' ? studentDonation : (parseFloat(customStudentDonation) || 0),
        schoolDonation: typeof schoolDonation === 'number' ? schoolDonation : (parseFloat(customSchoolDonation) || 0),
        autoDeposit: autoDeposit,
        deliveryOption: (deliveryOptions && deliveryOptions.length > 0) ? selectedDeliveryOption : '',
        customDeliveryOption: (deliveryOptions && deliveryOptions.length > 0 && selectedDeliveryOption === 'Autre') ? customDeliveryOption.trim() : '',
        customerDeliveryAddress: (deliveryOptions && deliveryOptions.length > 0 && selectedDeliveryOption === 'Livraison (si près de chez moi)') ? customerDeliveryAddress.trim() : '',
      }

      // Validate that we have products before sending
      if (!postData.products || postData.products.length === 0) {
        throw new Error('Votre panier est vide. Veuillez ajouter des produits avant de passer commande.');
      }

      const response = await fetch('/api/commandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })

      if (response.ok) {
        const responseData = await response.json();
        const orderIdFromResponse = responseData.orderId || responseData.order?.orderId;

        // Save final total before removing cart items
        const studentDonationAmount = typeof studentDonation === 'number' ? studentDonation : (parseFloat(customStudentDonation) || 0)
        const schoolDonationAmount = typeof schoolDonation === 'number' ? schoolDonation : (parseFloat(customSchoolDonation) || 0)
        const currentFinalTotal = total + studentDonationAmount + schoolDonationAmount
        setSavedFinalTotal(currentFinalTotal)

        // Remove items from cart ONLY after successful order creation
        removeAllItem()
        localStorage.removeItem('cartItems')
        if (orderIdFromResponse) {
          setOrderId(orderIdFromResponse);
        }
        setIsSuccess(true)

        // Track payment completed event
        if (finalStoreId) {
          trackPaymentCompleted({
            storeId: finalStoreId,
            campaignId: finalCampaignId || campaignId || null,
            schoolId: ownerSchool || finalSchoolId || schoolId || null,
            userId: null, // Will be extracted from session in API
            orderId: orderIdFromResponse,
            totalAmount: currentFinalTotal
          })
        }

        // Emit order success event for onboarding
        window.dispatchEvent(new CustomEvent('orderSuccess', {
          detail: { orderId: orderIdFromResponse }
        }));
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la création de la commande')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(`Une erreur est survenue lors de la création de la commande: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ensure success dialog stays open when isSuccess is true
  useEffect(() => {
    if (isSuccess) {
      // Prevent body scroll when success dialog is open
      document.body.style.overflow = 'hidden'
      // Ensure dialog stays open
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isSuccess])

  useEffect(() => {
    return () => {
      if (merciTimeoutRef.current) {
        clearTimeout(merciTimeoutRef.current)
      }
    }
  }, [])

  const handleSuccessClose = (open) => {
    // Prevent accidental closing - only allow closing via the button
    // If dialog is trying to close (open === false), prevent it
    if (open === false) {
      // Re-open the dialog immediately to prevent closing
      // This ensures the dialog stays open until user clicks "Fermer"
      setTimeout(() => {
        if (isSuccess) {
          // Force re-render to keep dialog open
          setIsSuccess(true)
        }
      }, 0)
      return
    }
  }

  const handleSuccessCloseButton = () => {
    // Show confirmation modal before closing
    setShowPaymentConfirmation(true)
  }

  const handlePaymentConfirmed = () => {
    if (showMerciAnimation) return

    if (merciTimeoutRef.current) {
      clearTimeout(merciTimeoutRef.current)
    }

    setShowMerciAnimation(true)
    merciTimeoutRef.current = setTimeout(() => {
      setShowPaymentConfirmation(false)
      setShowMerciAnimation(false)
      setIsSuccess(false)
      onClose()
      setFormData({ email: '', nom: '', phoneNumber: '' })
      setSavedFinalTotal(null) // Reset saved total
      window.location.reload()
      merciTimeoutRef.current = null
    }, 5000) // Increased from 1800ms to 5000ms (5 seconds)
  }

  const handlePaymentCancel = () => {
    if (showMerciAnimation) return
    setShowPaymentConfirmation(false)
    // Stay on the payment modal
  }

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
      toast.success('Copié dans le presse-papiers!')
    }).catch(err => {
      console.error('Erreur lors de la copie:', err)
      toast.error('Erreur lors de la copie')
    })
  }

  return (
    <>
      <Dialog open={!isSuccess} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sm:p-5 sticky top-0 z-10 shadow-lg">
            <DialogTitle className="text-lg sm:text-xl font-bold">Finaliser votre commande</DialogTitle>
            <DialogDescription className="text-blue-100 mt-1 text-xs sm:text-sm">
              Quelques informations et vous y êtes !
            </DialogDescription>
          </DialogHeader>
          {isExample && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-yellow-900 mb-1">
                    🛍️ Boutique Exemple
                  </h3>
                  <p className="text-sm text-yellow-800">
                    Cette boutique est un exemple pour vous montrer à quoi ressemble une boutique Massibec. Les commandes ne peuvent pas être passées ici. Pour créer votre propre boutique, inscrivez-vous en tant qu'élève ou école.
                  </p>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5 pb-20 sm:pb-6 bg-white">
            <div className="space-y-3">
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <Label htmlFor="nom" className="text-sm sm:text-base font-medium text-gray-700">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="pl-11 py-3 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm sm:text-base font-medium text-gray-700">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-11 py-3 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    placeholder="jean.dupont@example.com"
                  />
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-sm sm:text-base font-medium text-gray-700">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="pl-11 py-3 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Options Section */}
            {deliveryOptions && deliveryOptions.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-900">Option de livraison <span className="text-red-500">*</span></Label>
                  <RadioGroup
                    value={selectedDeliveryOption}
                    onValueChange={setSelectedDeliveryOption}
                    className="space-y-2"
                    required
                  >
                    {deliveryOptions.map((option) => {
                      const optionName = typeof option === 'string' ? option : option.name;
                      const isSelected = selectedDeliveryOption === optionName;
                      return (
                        <div key={optionName} className="space-y-1.5">
                          <div
                            className={`flex items-center space-x-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            onClick={(e) => {
                              // Don't prevent clicking on the radio button itself
                              if (e.target.closest('input') || e.target.closest('label')) {
                                return;
                              }
                              setSelectedDeliveryOption(optionName);
                            }}
                          >
                            <RadioGroupItem value={optionName} id={`delivery-${optionName}`} className="flex-shrink-0 h-5 w-5" />
                            <Label
                              htmlFor={`delivery-${optionName}`}
                              className={`flex-1 cursor-pointer text-sm sm:text-base font-medium ${isSelected ? 'text-blue-900' : 'text-gray-800'
                                }`}
                            >
                              {optionName}
                            </Label>
                          </div>

                          {/* Show pickup address if pickup option is selected */}
                          {optionName === 'Pickup (chez moi)' && isSelected && pickupAddress && (
                            <div className="ml-9 mt-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 mt-0.5">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-blue-900 mb-0.5">Adresse de pickup</p>
                                  <p className="text-sm text-blue-800">{pickupAddress}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Show delivery radius info if livraison option is selected */}
                          {optionName === 'Livraison (si près de chez moi)' && isSelected && deliveryRadiusMap[optionName] && (
                            <div className="ml-9 mt-1.5 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 mt-0.5">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-green-900 mb-0.5">Zone de livraison</p>
                                  <p className="text-sm text-green-800">{deliveryRadiusMap[optionName]}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {selectedDeliveryOption === 'Autre' && (
                    <div className="ml-9 mt-1.5">
                      <Input
                        type="text"
                        placeholder="Précisez votre option de livraison"
                        value={customDeliveryOption}
                        onChange={(e) => setCustomDeliveryOption(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        required
                      />
                    </div>
                  )}
                  {selectedDeliveryOption === 'Livraison (si près de chez moi)' && (
                    <div className="ml-9 mt-1.5 space-y-1.5">
                      <Label className="text-sm sm:text-base font-medium text-gray-700 block">
                        Votre adresse de livraison <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Ex: 123 rue Principale, Québec, QC G1A 1A1"
                        value={customerDeliveryAddress}
                        onChange={(e) => setCustomerDeliveryAddress(e.target.value)}
                        className="w-full py-2.5 sm:py-3 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        required
                      />
                      <p className="text-xs sm:text-sm text-gray-500">
                        Assurez-vous que votre adresse est dans la zone de livraison indiquée ci-dessus.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator className="my-4" />

            {/* Student Donations Section */}
            {campaign?.donationsForStudents?.enabled && (
              <Card className="border-blue-200 border">
                <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                  <CardTitle className="text-sm sm:text-base font-semibold text-blue-800">
                    Don pour les {terminology.participantsLabel.charAt(0).toUpperCase() + terminology.participantsLabel.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-4 pb-3">
                  <RadioGroup
                    value={
                      studentDonation === 'custom' ||
                        (typeof studentDonation === 'number' && customStudentDonation && parseFloat(customStudentDonation) > 0)
                        ? 'custom'
                        : studentDonation.toString()
                    }
                    onValueChange={handleStudentDonationChange}
                    className="flex flex-wrap gap-2"
                  >
                    {(campaign?.donationsForStudents?.presets || [0, 2, 5]).map((amount) => (
                      <div key={amount} className="flex items-center">
                        <RadioGroupItem value={amount.toString()} id={`student-donation-${amount}`} className="peer sr-only" />
                        <Label
                          htmlFor={`student-donation-${amount}`}
                          className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium border rounded-full cursor-pointer transition-all ${studentDonation === amount ? 'bg-blue-100 border-blue-500 text-blue-900' : 'hover:bg-gray-100 border-gray-300'}`}
                        >
                          {amount === 0 ? 'Pas de don' : `${amount}$`}
                        </Label>
                      </div>
                    ))}
                    {/* Custom Student Donation Option */}
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="custom" id="student-donation-custom" className="peer sr-only" />
                      <Label
                        htmlFor="student-donation-custom"
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium border rounded-full cursor-pointer transition-all ${studentDonation === 'custom' ||
                          (typeof studentDonation === 'number' && customStudentDonation && parseFloat(customStudentDonation) > 0)
                          ? 'bg-blue-100 border-blue-500 text-blue-900'
                          : 'hover:bg-gray-100 border-gray-300'
                          }`}
                      >
                        Autre
                      </Label>
                      {(studentDonation === 'custom' || (typeof studentDonation === 'number' && customStudentDonation && parseFloat(customStudentDonation) > 0)) && (
                        <Input
                          type="number"
                          placeholder="Montant"
                          value={customStudentDonation}
                          onChange={handleCustomStudentDonationChange}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24 text-sm px-2 py-1.5 border rounded-lg"
                          min="0"
                          step="0.01"
                        />
                      )}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* School Donations Section */}
            {campaign?.donationsForSchool?.enabled && (
              <Card className="border-green-200 border">
                <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                  <CardTitle className="text-sm sm:text-base font-semibold text-green-800">
                    Don pour l'{terminology.organizationLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-4 pb-3">
                  <RadioGroup
                    value={
                      schoolDonation === 'custom' ||
                        (typeof schoolDonation === 'number' && customSchoolDonation && parseFloat(customSchoolDonation) > 0)
                        ? 'custom'
                        : schoolDonation.toString()
                    }
                    onValueChange={handleSchoolDonationChange}
                    className="flex flex-wrap gap-2"
                  >
                    {(campaign?.donationsForSchool?.presets || [0, 2, 5]).map((amount) => (
                      <div key={amount} className="flex items-center">
                        <RadioGroupItem value={amount.toString()} id={`school-donation-${amount}`} className="peer sr-only" />
                        <Label
                          htmlFor={`school-donation-${amount}`}
                          className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium border rounded-full cursor-pointer transition-all ${schoolDonation === amount ? 'bg-green-100 border-green-500 text-green-900' : 'hover:bg-gray-100 border-gray-300'}`}
                        >
                          {amount === 0 ? 'Pas de don' : `${amount}$`}
                        </Label>
                      </div>
                    ))}
                    {/* Custom School Donation Option */}
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="custom" id="school-donation-custom" className="peer sr-only" />
                      <Label
                        htmlFor="school-donation-custom"
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium border rounded-full cursor-pointer transition-all ${schoolDonation === 'custom' ||
                          (typeof schoolDonation === 'number' && customSchoolDonation && parseFloat(customSchoolDonation) > 0)
                          ? 'bg-green-100 border-green-500 text-green-900'
                          : 'hover:bg-gray-100 border-gray-300'
                          }`}
                      >
                        Autre
                      </Label>
                      {(schoolDonation === 'custom' || (typeof schoolDonation === 'number' && customSchoolDonation && parseFloat(customSchoolDonation) > 0)) && (
                        <Input
                          type="number"
                          placeholder="Montant"
                          value={customSchoolDonation}
                          onChange={handleCustomSchoolDonationChange}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24 text-sm px-2 py-1.5 border rounded-lg"
                          min="0"
                          step="0.01"
                        />
                      )}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Total Amount - Prominent */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-xl shadow-xl border-2 border-blue-500">
              <div className="space-y-2">
                {discount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-xs sm:text-sm text-blue-100">
                      <span>Sous-total produits:</span>
                      <span className="font-medium">{(originalTotal || total).toFixed(2)}$</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm text-green-200">
                      <span className="font-medium">Rabais ({discount * 100}%):</span>
                      <span className="font-medium">-{(discountAmount || (originalTotal || total) * discount).toFixed(2)}$</span>
                    </div>
                  </>
                )}
                {(typeof studentDonation === 'number' ? studentDonation : (parseFloat(customStudentDonation) || 0)) > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm text-blue-100">
                    <span>Don {terminology.participant}:</span>
                    <span className="font-medium">{((typeof studentDonation === 'number' ? studentDonation : (parseFloat(customStudentDonation) || 0))).toFixed(2)}$</span>
                  </div>
                )}
                {(typeof schoolDonation === 'number' ? schoolDonation : (parseFloat(customSchoolDonation) || 0)) > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm text-blue-100">
                    <span>Don {terminology.organization}:</span>
                    <span className="font-medium">{((typeof schoolDonation === 'number' ? schoolDonation : (parseFloat(customSchoolDonation) || 0))).toFixed(2)}$</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-lg sm:text-xl pt-2 border-t-2 border-blue-400">
                  <span>Total à payer:</span>
                  <span className="text-yellow-200">{finalTotal.toFixed(2)}$</span>
                </div>
              </div>
            </div>

            {/* Form Actions - Fixed for mobile with safe area */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-white pt-3 pb-safe border-t border-gray-200 -mx-4 sm:-mx-5 px-4 sm:px-5">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto py-2.5 text-sm border-gray-300 hover:bg-gray-50 order-2 sm:order-1">
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !owner || isLoadingOwner || isExample}
                className="w-full sm:flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white flex items-center justify-center py-4 text-base sm:text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Traitement...
                  </>
                ) : isExample ? (
                  'Boutique exemple - Commande désactivée'
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Confirmer et payer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Only show when isSuccess is true and checkout form is closed */}
      {isSuccess && (
        <Dialog open={true} onOpenChange={(open) => {
          // Prevent closing by clicking outside or escape key
          // Only allow closing via the "Fermer" button
          if (!open) {
            // Keep dialog open
            return
          }
        }} modal={true}>
          <DialogContent
            className="sm:max-w-[500px] bg-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
            onPointerDownOutside={(e) => {
              // Prevent closing by clicking outside
              e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              // Prevent closing by pressing escape
              e.preventDefault()
            }}
            onInteractOutside={(e) => {
              // Prevent closing by any outside interaction
              e.preventDefault()
            }}
          >
            {/* Hide the default close button using CSS */}
            <style dangerouslySetInnerHTML={{
              __html: `
                [data-radix-dialog-content] button[class*="absolute right-4 top-4"] {
                  display: none !important;
                }
              `
            }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center p-4 sm:p-6"
            >
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <DialogTitle className="text-2xl font-bold text-green-600 mb-2 text-center">Merci pour votre commande!</DialogTitle>
              <DialogDescription className="text-center text-gray-700 mb-6">
                Votre commande a été enregistrée avec succès. Veuillez suivre les étapes ci-dessous pour finaliser votre paiement par virement Interac.
              </DialogDescription>

              {/* Payment Instructions */}
              <div className="w-full space-y-4 mb-6">
                {/* Bank Links */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">1. Choisissez votre banque :</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <a href="https://www.desjardins.com/fr/" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full h-auto py-2 px-2 flex flex-col items-center justify-center gap-1.5">
                        <img src="/images/desjardins.svg" alt="Desjardins" className="w-8 h-8 object-contain" />
                        <span className="text-xs font-medium">Desjardins</span>
                      </Button>
                    </a>
                    <a href="https://www.bnc.ca/fr/particuliers.html" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full h-auto py-2 px-2 flex flex-col items-center justify-center gap-1.5">
                        <img src="/images/bnc.svg" alt="BNC" className="w-8 h-8 object-contain" />
                        <span className="text-xs font-medium">BNC</span>
                      </Button>
                    </a>
                    <a href="https://www.rbcbanqueroyale.com/" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full h-auto py-2 px-2 flex flex-col items-center justify-center gap-1.5">
                        <img src="/images/rbc.svg" alt="RBC" className="w-8 h-8 object-contain" />
                        <span className="text-xs font-medium">RBC</span>
                      </Button>
                    </a>
                    <a href="https://www.td.com/ca/fr/perso/" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full h-auto py-2 px-2 flex flex-col items-center justify-center gap-1.5">
                        <img src="/images/TD.svg" alt="TD" className="w-8 h-8 object-contain" />
                        <span className="text-xs font-medium">TD</span>
                      </Button>
                    </a>
                    <a href="https://www.scotiabank.com/ca/fr/particuliers.html" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full h-auto py-2 px-2 flex flex-col items-center justify-center gap-1.5">
                        <img src="/images/Scotiabank.svg" alt="Scotiabank" className="w-8 h-8 object-contain" />
                        <span className="text-xs font-medium">Scotiabank</span>
                      </Button>
                    </a>
                    <a href="https://www.cibc.com/fr/personal-banking.html" target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full h-auto py-2 px-2 flex flex-col items-center justify-center gap-1.5">
                        <img src="/images/cibc.svg" alt="CIBC" className="w-8 h-8 object-contain" />
                        <span className="text-xs font-medium">CIBC</span>
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">Instructions pour le virement Interac</h3>
                  <p className="text-xs text-blue-700 mb-3">Veuillez utiliser les informations ci-dessous pour effectuer votre virement Interac :</p>

                  {owner && (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-gray-700 flex-1">
                          <strong>2. Destinataire :</strong> {owner.name || owner.firstName || 'N/A'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyToClipboard(owner.name || owner.firstName || '', 'destinataire')}
                          title="Copier le destinataire"
                        >
                          {copiedField === 'destinataire' ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <p className="text-gray-700 flex-1">
                          <strong>3. Adresse courriel :</strong> {ownerEmail}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyToClipboard(ownerEmail, 'email')}
                          title="Copier l'email"
                        >
                          {copiedField === 'email' ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </Button>
                      </div>

                      {!autoDeposit && (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-gray-700 flex-1">
                              <strong>4. Question de sécurité :</strong> Numéro de commande
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={() => copyToClipboard('Numéro de commande', 'question')}
                              title="Copier la question"
                            >
                              {copiedField === 'question' ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-gray-500" />
                              )}
                            </Button>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <p className="text-gray-700 flex-1">
                              <strong>5. Réponse :</strong> {orderId ? `Cmd-${orderId}` : 'N/A'}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={() => copyToClipboard(orderId ? `Cmd-${orderId}` : '', 'reponse')}
                              title="Copier la réponse"
                            >
                              {copiedField === 'reponse' ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <p className="text-gray-700 flex-1">
                          <strong>{autoDeposit ? '4' : '6'}. Montant :</strong> {displayTotal.toFixed(2)} $
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyToClipboard(displayTotal.toFixed(2), 'montant')}
                          title="Copier le montant"
                        >
                          {copiedField === 'montant' ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </Button>
                      </div>

                      {orderId && (
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-gray-700 flex-1">
                            <strong>{autoDeposit ? '5' : '7'}. Message :</strong> #{orderId}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => copyToClipboard(`#${orderId}`, 'message')}
                            title="Copier le message"
                          >
                            {copiedField === 'message' ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {!owner && (
                    <p className="text-sm text-gray-600">
                      Les informations de paiement seront envoyées par email.
                    </p>
                  )}
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>IMPORTANT :</strong> Assurez-vous de faire le virement avant de quitter cette page.
                    Vous allez sous peu recevoir un courriel de confirmation avec ces mêmes informations de paiement.
                    Ne pas tenir compte du paiement si c'est déjà fait. Il se peut qu'il soit dans les indésirables.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSuccessCloseButton}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base rounded-lg w-full"
              >
                Fermer
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Confirmation Dialog */}
      <Dialog
        open={showPaymentConfirmation}
        onOpenChange={(open) => {
          if (showMerciAnimation && !open) return
          setShowPaymentConfirmation(open)
        }}
      >
        <DialogContent className="sm:max-w-[500px] md:max-w-[550px] bg-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              {showMerciAnimation ? 'Merci!' : 'Confirmation de paiement'}
            </DialogTitle>
            <DialogDescription className="text-gray-700 text-sm">
              {showMerciAnimation
                ? 'Nous avons bien noté votre confirmation. Merci de soutenir la campagne!'
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 overflow-x-hidden">
            <AnimatePresence mode="wait">
              {showMerciAnimation ? (
                <motion.div
                  key="merci"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center text-center space-y-4 py-6"
                >
                  <motion.div
                    initial={{ rotate: -12, opacity: 0 }}
                    animate={{ rotate: [-12, 12, -8, 8, 0], opacity: 1 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  >
                    <PartyPopper className="h-16 w-16 text-green-500" />
                  </motion.div>
                  <p className="text-3xl font-extrabold text-green-600 tracking-tight">
                    Merci!
                  </p>
                  <p className="text-sm text-gray-600 max-w-sm">
                    Votre confirmation nous permet de finaliser la commande. Nous préparons la suite et la page se rafraîchira sous peu.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3 w-full"
                >
                  <p className="text-sm text-gray-600 break-words">
                    Avez-vous reçu la confirmation de paiement de votre institution financière ?
                  </p>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!showMerciAnimation && (
            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={handlePaymentCancel}
                className="w-full sm:flex-1 text-sm sm:text-sm"
              >
                Non, je n&apos;ai pas reçu la confirmation
              </Button>
              <Button
                onClick={handlePaymentConfirmed}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-sm"
              >
                Oui, j&apos;ai reçu la confirmation
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
