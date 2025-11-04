// components/CheckoutForm.jsx

import { useState, useEffect, useMemo } from 'react'
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
import { Loader2, CheckCircle, CreditCard, Mail, Phone, User, DollarSign, Copy, Check } from 'lucide-react'
import { getTerminology } from '@/utils/organizationHelpers'

export default function CheckoutForm({ total, onClose, items, removeAllItem, campaignId, schoolId }) {
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    phoneNumber: '',
  })
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerSchool, setOwnerSchool] = useState('')
  const [ownerId, setOwnerId] = useState(null)
  const [owner, setOwner] = useState(null)
  const [isLoadingOwner, setIsLoadingOwner] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  
  // Separate donation states
  const [studentDonation, setStudentDonation] = useState(0)
  const [customStudentDonation, setCustomStudentDonation] = useState('')
  const [schoolDonation, setSchoolDonation] = useState(0)
  const [customSchoolDonation, setCustomSchoolDonation] = useState('')
  
  const [storeId, setStoreId] = useState()
  const [autoDeposit, setAutoDeposit] = useState()
  const [campaign, setCampaign] = useState(null)
  
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
    const donations = (studentDonation || 0) + (schoolDonation || 0)
    const calculated = baseTotal + donations
    // Save the total when it's calculated (before cart is emptied)
    if (calculated > 0 && !savedFinalTotal) {
      setSavedFinalTotal(calculated)
    }
    return calculated
  }, [total, studentDonation, schoolDonation, savedFinalTotal])
  
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

  useEffect(() => {
    if (!router.isReady) return

    const storeIdParam = router.query
    if (storeIdParam && storeIdParam.id) {
      setStoreId(storeIdParam.id)
      fetchOwnerInfo(storeIdParam.id)
    }
  }, [router.isReady, router.query])


  const fetchOwnerInfo = async (storeId) => {
    try {
      setIsLoadingOwner(true)
      const response = await fetch(`/api/stores/${storeId}`)
      if (response.ok) {
        const data = await response.json()
        setOwnerEmail(data.ownerEmail)
        setOwnerSchool(data.ownerSchool)
        setOwnerId(data.ownerId)
        setOwner(data.owner)
        setAutoDeposit(data.autoDeposit)
        
        // Use campaignId from props if available, otherwise use from API
        if (campaignId) {
          setFinalCampaignId(campaignId)
        } else if (data.campaignId) {
          setFinalCampaignId(data.campaignId)
        }
        
        // Use schoolId from props if available, otherwise use from API
        if (schoolId) {
          setFinalSchoolId(schoolId)
        } else if (data.ownerSchool) {
          setFinalSchoolId(data.ownerSchool)
        }
        
        // Use finalCampaignId (from props or API) to load campaign data for donations
        const activeCampaignId = finalCampaignId || data.campaignId || null
        
        // If no campaignId yet, try to get from owner (fallback)
        let campaignIdToLoad = activeCampaignId
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
        }
        
        if (campaignIdToLoad) {
          try {
            const campaignResponse = await fetch(`/api/campaigns/${campaignIdToLoad}`)
            if (campaignResponse.ok) {
              const campaignData = await campaignResponse.json()
              // API returns { campaign: {...} }, so extract the campaign object
              const campaign = campaignData.campaign || campaignData
              // Ensure donations config has defaults if not set
              if (campaign) {
                campaign.donationsForStudents = campaign.donationsForStudents || {
                  enabled: true,
                  presets: [0, 5, 10, 20]
                }
                campaign.donationsForSchool = campaign.donationsForSchool || {
                  enabled: true,
                  presets: [0, 5, 10, 20]
                }
                // Ensure enabled is boolean (default to true if undefined)
                if (campaign.donationsForStudents.enabled === undefined || campaign.donationsForStudents.enabled === null) {
                  campaign.donationsForStudents.enabled = true
                }
                if (campaign.donationsForSchool.enabled === undefined || campaign.donationsForSchool.enabled === null) {
                  campaign.donationsForSchool.enabled = true
                }
                // Ensure presets exist and are arrays
                if (!campaign.donationsForStudents.presets || !Array.isArray(campaign.donationsForStudents.presets) || campaign.donationsForStudents.presets.length === 0) {
                  campaign.donationsForStudents.presets = [0, 5, 10, 20]
                }
                if (!campaign.donationsForSchool.presets || !Array.isArray(campaign.donationsForSchool.presets) || campaign.donationsForSchool.presets.length === 0) {
                  campaign.donationsForSchool.presets = [0, 5, 10, 20]
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
          console.warn('No active campaign found for owner:', data.owner)
        }
      } else {
        console.error('Erreur lors de la récupération des données de la boutique')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoadingOwner(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Student donation handlers
  const handleStudentDonationChange = (value) => {
    if (value === 'custom') {
      setStudentDonation(parseFloat(customStudentDonation) || 0)
    } else {
      setStudentDonation(parseFloat(value))
      setCustomStudentDonation('')
    }
  }

  const handleCustomStudentDonationChange = (e) => {
    setCustomStudentDonation(e.target.value)
    setStudentDonation(parseFloat(e.target.value) || 0)
  }

  // School donation handlers
  const handleSchoolDonationChange = (value) => {
    if (value === 'custom') {
      setSchoolDonation(parseFloat(customSchoolDonation) || 0)
    } else {
      setSchoolDonation(parseFloat(value))
      setCustomSchoolDonation('')
    }
  }

  const handleCustomSchoolDonationChange = (e) => {
    setCustomSchoolDonation(e.target.value)
    setSchoolDonation(parseFloat(e.target.value) || 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!owner || !owner._id) {
      toast.error('Informations du propriétaire non disponibles. Veuillez réessayer plus tard.')
      return
    }

    // Check if school or campaign is available
    if (!finalSchoolId && !finalCampaignId) {
      toast.error('Aucune école ou campagne associée à votre boutique. Veuillez vous assurer que vous êtes bien associé à une campagne active ou contactez le support.')
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
      removeAllItem()
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
        storeId: storeId,
        school: ownerSchool || finalSchoolId, // Use finalSchoolId if ownerSchool not set
        campaignId: finalCampaignId, // Campaign-based: pass campaignId directly
        owner: owner,
        studentDonation: studentDonation,
        schoolDonation: schoolDonation,
        autoDeposit: autoDeposit,
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
        const currentFinalTotal = total + studentDonation + schoolDonation
        setSavedFinalTotal(currentFinalTotal)
        
        localStorage.removeItem('cartItems')
        if (orderIdFromResponse) {
          setOrderId(orderIdFromResponse);
        }
        setIsSuccess(true)
        
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

  const handleSuccessClose = () => {
    // Show confirmation modal before closing
    setShowPaymentConfirmation(true)
  }

  const handlePaymentConfirmed = () => {
    setShowPaymentConfirmation(false)
    setIsSuccess(false)
    onClose()
    setFormData({ email: '', nom: '', phoneNumber: '' })
    setSavedFinalTotal(null) // Reset saved total
    window.location.reload()
  }

  const handlePaymentCancel = () => {
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
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 sticky top-0 z-10">
            <DialogTitle className="text-xl sm:text-2xl font-bold">Finaliser votre commande</DialogTitle>
            <DialogDescription className="text-blue-100 mt-2 text-sm sm:text-base">
              Nous sommes presque là ! Remplissez vos informations pour compléter votre achat.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 p-4 sm:p-6 pb-24 sm:pb-6 bg-white">
            <div className="space-y-4">
              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-sm font-medium text-gray-700">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="pl-10 py-3 text-base"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-10 py-3 text-base"
                    placeholder="jean.dupont@example.com"
                  />
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="pl-10 py-3 text-base"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Student Donations Section */}
            {campaign?.donationsForStudents?.enabled && (
              <Card className="border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-blue-800">
                    Don pour les {terminology.participantsLabel.charAt(0).toUpperCase() + terminology.participantsLabel.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup onValueChange={handleStudentDonationChange} className="flex flex-wrap gap-4">
                    {(campaign?.donationsForStudents?.presets || [0, 2, 5]).map((amount) => (
                      <div key={amount} className="flex items-center">
                        <RadioGroupItem value={amount.toString()} id={`student-donation-${amount}`} className="peer sr-only" />
                        <Label
                          htmlFor={`student-donation-${amount}`}
                          className={`flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-full cursor-pointer ${studentDonation === amount ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
                        >
                          {amount === 0 ? 'Pas de don' : `${amount}$`}
                        </Label>
                      </div>
                    ))}
                    {/* Custom Student Donation Option */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="student-donation-custom" className="peer sr-only" />
                      <Label
                        htmlFor="student-donation-custom"
                        className={`flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-full cursor-pointer ${studentDonation === 'custom' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
                      >
                        Personnalisé
                      </Label>
                      <Input
                        type="number"
                        placeholder="Montant"
                        value={customStudentDonation}
                        onChange={handleCustomStudentDonationChange}
                        className="w-24 text-sm px-2 py-1 border rounded"
                      />
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* School Donations Section */}
            {campaign?.donationsForSchool?.enabled && (
              <Card className="border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-green-800">
                    Don pour l'{terminology.organizationLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup onValueChange={handleSchoolDonationChange} className="flex flex-wrap gap-4">
                    {(campaign?.donationsForSchool?.presets || [0, 2, 5]).map((amount) => (
                      <div key={amount} className="flex items-center">
                        <RadioGroupItem value={amount.toString()} id={`school-donation-${amount}`} className="peer sr-only" />
                        <Label
                          htmlFor={`school-donation-${amount}`}
                          className={`flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-full cursor-pointer ${schoolDonation === amount ? 'bg-green-100 border-green-500' : 'hover:bg-gray-100'}`}
                        >
                          {amount === 0 ? 'Pas de don' : `${amount}$`}
                        </Label>
                      </div>
                    ))}
                    {/* Custom School Donation Option */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="school-donation-custom" className="peer sr-only" />
                      <Label
                        htmlFor="school-donation-custom"
                        className={`flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-full cursor-pointer ${schoolDonation === 'custom' ? 'bg-green-100 border-green-500' : 'hover:bg-gray-100'}`}
                      >
                        Personnalisé
                      </Label>
                      <Input
                        type="number"
                        placeholder="Montant"
                        value={customSchoolDonation}
                        onChange={handleCustomSchoolDonationChange}
                        className="w-24 text-sm px-2 py-1 border rounded"
                      />
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Total Amount */}
            <div className="flex justify-between items-center font-semibold text-lg bg-gray-100 p-4 rounded-lg">
              <span>Total à payer:</span>
              <span className="text-blue-700">{(total + studentDonation + schoolDonation).toFixed(2)}$</span>
            </div>

            {/* Form Actions - Fixed for mobile with safe area */}
            <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-0 bg-white pt-4 pb-safe">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto py-3 text-base order-2 sm:order-1">
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !owner || isLoadingOwner}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center py-3 sm:py-4 text-base font-semibold shadow-lg order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Traitement en cours...
                  </>
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

      {/* Success Dialog */}
      <AnimatePresence>
        {isSuccess && (
          <Dialog open={isSuccess} onOpenChange={handleSuccessClose}>
            <DialogContent className="sm:max-w-[500px] bg-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
                                <strong>4. Question de sécurité :</strong> {formData.nom || 'Votre nom'}
                              </p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => copyToClipboard(formData.nom || '', 'question')}
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
                                <strong>5. Réponse :</strong> {formData.email}
                              </p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => copyToClipboard(formData.email || '', 'reponse')}
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
                  onClick={handleSuccessClose}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base rounded-lg w-full"
                >
                  Fermer
                </Button>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentConfirmation} onOpenChange={setShowPaymentConfirmation}>
        <DialogContent className="sm:max-w-[450px] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
              Confirmation de paiement
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              IMPORTANT : Assurez-vous de faire le virement avant de quitter cette page.
              Vous allez sous peu recevoir un courriel de confirmation avec ces mêmes informations de paiement. 
              Ne pas tenir compte du paiement si c'est déjà fait. Il se peut qu'il soit dans les indésirables.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Avez-vous effectué le virement Interac avec les informations fournies ?
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
              <p className="text-xs text-blue-800">
                Si vous n'avez pas encore fait le virement, vous pouvez le faire maintenant en utilisant 
                les informations affichées ci-dessus. Une fois le virement complété, vous pouvez confirmer.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={handlePaymentCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePaymentConfirmed}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Oui, j'ai effectué le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}