import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { trackRegistrationStarted, trackRegistrationStep, trackRegistrationCompleted } from '@/lib/funnelAnalytics'

export default function MultiStepInscriptionForm() {
  const router = useRouter()
  const { campaignId, token } = router.query
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const hasTrackedStarted = useRef(false)

  // Check for campaign join info from sessionStorage (from QR code)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCampaignId = sessionStorage.getItem('joinCampaignId');
      const storedToken = sessionStorage.getItem('joinCampaignToken');
      if (storedCampaignId && storedToken && !campaignId && !token) {
        // Update URL to include campaign info
        router.replace(`/inscription?campaignId=${storedCampaignId}&token=${storedToken}`, undefined, { shallow: true });
      }
    }
  }, []);

  const [formData, setFormData] = useState({
    // Step 1: Email & Basic Info
    email: '',
    prenom: '',
    nom: '',
    motDePasse: '',
    confirmationMotDePasse: '',

    // Step 2: Parent Info
    nomParent: '',
    prenomParent: '',
    telephone: ''
  })


  const steps = [
    { id: 1, title: 'Informations de base' },
    { id: 2, title: 'Informations parent' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Track registration started on first interaction
    if (!hasTrackedStarted.current) {
      hasTrackedStarted.current = true
      trackRegistrationStarted('student')
    }

    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  // Check if email exists
  const checkEmailExists = async (email) => {
    if (!email || !email.includes('@')) return

    setIsCheckingEmail(true)
    try {
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      setEmailExists(data.exists)

      if (data.exists) {
        setErrorMessage('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter ou utiliser une autre adresse.')
      }
    } catch (error) {
      console.error('Error checking email:', error)
    } finally {
      setIsCheckingEmail(false)
    }
  }

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkEmailExists(formData.email)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.email])

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.prenom || !formData.nom || !formData.motDePasse || !formData.confirmationMotDePasse) {
          setErrorMessage('Veuillez remplir tous les champs obligatoires')
          return false
        }
        if (formData.motDePasse !== formData.confirmationMotDePasse) {
          setErrorMessage('Les mots de passe ne correspondent pas')
          return false
        }
        if (emailExists) {
          setErrorMessage('Cette adresse e-mail est déjà utilisée')
          return false
        }
        return true

      case 2:
        if (!formData.nomParent || !formData.prenomParent || !formData.telephone) {
          setErrorMessage('Veuillez remplir tous les champs obligatoires')
          return false
        }
        return true

      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setErrorMessage('')
      // Track step completion
      trackRegistrationStep(currentStep, 'student')
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    } else {
      // Add visual feedback for validation errors
      const button = document.querySelector('button[type="button"]');
      if (button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = '';
        }, 150);
      }
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setErrorMessage('')
  }


  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateStep(2)) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      // Get campaign info from URL params or sessionStorage
      const campaignIdToJoin = campaignId || (typeof window !== 'undefined' ? sessionStorage.getItem('joinCampaignId') : null);
      const tokenToJoin = token || (typeof window !== 'undefined' ? sessionStorage.getItem('joinCampaignToken') : null);
      const groupIdToJoin = typeof window !== 'undefined' ? sessionStorage.getItem('joinCampaignGroupId') : null;

      const response = await fetch('/api/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.prenom} ${formData.nom}`,
          email: formData.email,
          password: formData.motDePasse,
          parentInfo: {
            nomParent: formData.nomParent,
            prenomParent: formData.prenomParent,
            telephone: formData.telephone,
          },
          ...(campaignIdToJoin && tokenToJoin ? {
            campaignId: campaignIdToJoin,
            token: tokenToJoin,
            ...(groupIdToJoin ? { groupId: groupIdToJoin } : {})
          } : {})
        }),
      })

      if (response.ok) {
        const data = await response.json();

        // Track registration completion
        trackRegistrationCompleted('student', { email: formData.email })

        // Store email in sessionStorage for cross-device verification detection
        sessionStorage.setItem('pendingVerificationEmail', formData.email);

        // Clear campaign join info from sessionStorage if used
        if (campaignIdToJoin && tokenToJoin) {
          sessionStorage.removeItem('joinCampaignId');
          sessionStorage.removeItem('joinCampaignToken');
          sessionStorage.removeItem('joinCampaignGroupId');
        }

        // Show success message
        const successMessage = data.joinedCampaign
          ? "🎉 Inscription réussie ! La campagne a été automatiquement ajoutée à votre compte. Vérifiez votre email pour confirmer votre compte."
          : "🎉 Inscription réussie ! Vérifiez votre email pour confirmer votre compte.";

        toast({
          title: "🎉 Inscription réussie !",
          description: successMessage,
          duration: 5000,
        });

        // Redirect to verification page
        setTimeout(() => {
          router.push('/email-verification');
        }, 2000);
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage(error.message || 'Une erreur est survenue lors de l\'inscription')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Créer votre compte</h2>
              <p className="text-gray-600">Commençons par vos informations de base</p>
              {(campaignId || (typeof window !== 'undefined' && sessionStorage.getItem('joinCampaignId'))) ? (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    <strong>✅ Campagne détectée :</strong> La campagne sera automatiquement ajoutée à votre compte après l'inscription !
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>💡 Astuce :</strong> Vous pourrez rejoindre une campagne de financement après votre inscription !
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse e-mail du parent(pour réception transfert interact et communication)
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full py-4 px-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${emailExists ? 'border-red-300 bg-red-50' :
                      formData.email && !emailExists ? 'border-green-300 bg-green-50' :
                        'border-gray-300 hover:border-gray-400'
                      }`}
                    placeholder="votre@email.com"
                    required
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {!isCheckingEmail && formData.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailExists ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom de l'élève
                  </Label>
                  <Input
                    type="text"
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Votre prénom"
                    className="w-full py-4 px-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'élève
                  </Label>
                  <Input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full py-4 px-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </Label>
                <Input
                  type="password"
                  id="motDePasse"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmationMotDePasse" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </Label>
                <Input
                  type="password"
                  id="confirmationMotDePasse"
                  name="confirmationMotDePasse"
                  value={formData.confirmationMotDePasse}
                  onChange={handleChange}
                  placeholder="Répétez votre mot de passe"
                  className={`w-full py-3 px-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                    }`}
                  required
                />
                {formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse && (
                  <p className="text-sm text-red-500 mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations parent</h2>
              <p className="text-gray-600">Dernière étape ! Informations du parent responsable</p>
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                  <strong>🎉 Presque terminé !</strong> Après cette étape, vous pourrez rejoindre une campagne de financement et commencer à vendre.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenomParent" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom du parent
                  </Label>
                  <Input
                    type="text"
                    id="prenomParent"
                    name="prenomParent"
                    value={formData.prenomParent}
                    onChange={handleChange}
                    placeholder="Prénom du parent"
                    className="w-full py-4 px-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nomParent" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du parent
                  </Label>
                  <Input
                    type="text"
                    id="nomParent"
                    name="nomParent"
                    value={formData.nomParent}
                    onChange={handleChange}
                    placeholder="Nom du parent"
                    className="w-full py-4 px-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </Label>
                <Input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="(514) 123-4567"
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Enhanced Progress */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-2">Inscription Étudiant</h1>
              <p className="text-blue-100">Rejoignez votre campagne de financement en quelques étapes</p>
            </div>
            <div className="flex justify-center space-x-3 mb-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index + 1 <= currentStep
                    ? 'bg-white shadow-lg'
                    : 'bg-white/30'
                    }`}
                />
              ))}
            </div>
            <p className="text-center text-sm text-blue-100">
              Étape {currentStep} sur {steps.length}
            </p>
          </div>

          <div className="p-8">

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-lg shadow-sm"
              >
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                  <p className="text-red-700 font-medium">{errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Form Content */}
            <form onSubmit={currentStep === 2 ? handleSubmit : (e) => e.preventDefault()}>
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>
            </form>

            {/* Simple Navigation */}
            <div className="mt-8">
              {currentStep < 2 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Continuer
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Inscription en cours...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Finaliser l'inscription
                    </div>
                  )}
                </Button>
              )}

              <p className="text-center text-sm text-gray-500 mt-4">
                Déjà inscrit ?{' '}
                <button
                  onClick={() => router.push('/connexion')}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
