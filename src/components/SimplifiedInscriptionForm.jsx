import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Eye, EyeOff, Banknote, Mail } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { trackRegistrationStarted, trackRegistrationCompleted } from '@/lib/funnelAnalytics'

/**
 * Version ultra-simplifiée du formulaire d'inscription
 * - 1 seule étape
 * - Seulement 3 champs: Email, Prénom, Mot de passe
 * - Message clair pour Interac
 * - Pas de vérification email bloquante (différée)
 * - Connexion automatique après inscription
 */
export default function SimplifiedInscriptionForm() {
  const router = useRouter()
  const { campaignId, token } = router.query
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const hasTrackedStarted = useRef(false)

  // Check for campaign join info from sessionStorage (from QR code)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCampaignId = sessionStorage.getItem('joinCampaignId');
      const storedToken = sessionStorage.getItem('joinCampaignToken');
      if (storedCampaignId && storedToken && !campaignId && !token) {
        router.replace(`/inscription?campaignId=${storedCampaignId}&token=${storedToken}`, undefined, { shallow: true });
      }
    }
  }, []);

  // Ultra-simplified form data: only 3 fields
  const [formData, setFormData] = useState({
    email: '',
    prenom: '',
    motDePasse: ''
  })

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
        setErrorMessage('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.')
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

  const validateForm = () => {
    if (!formData.email || !formData.prenom || !formData.motDePasse) {
      setErrorMessage('Veuillez remplir tous les champs')
      return false
    }

    if (!formData.email.includes('@')) {
      setErrorMessage('Veuillez entrer une adresse email valide')
      return false
    }

    if (emailExists) {
      setErrorMessage('Cette adresse e-mail est déjà utilisée')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

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
          name: formData.prenom.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.motDePasse,
          // parentInfo is now optional - not sent
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

        // Clear campaign join info from sessionStorage if used
        if (campaignIdToJoin && tokenToJoin) {
          sessionStorage.removeItem('joinCampaignId');
          sessionStorage.removeItem('joinCampaignToken');
          sessionStorage.removeItem('joinCampaignGroupId');
        }

        // Show success message
        toast({
          title: "🎉 Inscription réussie !",
          description: data.joinedCampaign
            ? "Connexion en cours..."
            : "Connexion en cours...",
          duration: 3000,
        });

        // Auto-login the user immediately
        const signInResult = await signIn('credentials', {
          email: formData.email.trim().toLowerCase(),
          password: formData.motDePasse,
          redirect: false
        });

        if (signInResult?.ok) {
          // If user already joined a campaign (via QR code), go to dashboard
          // Otherwise, go to the full-page campaign join experience
          const redirectUrl = data.joinedCampaign
            ? '/dashboard'
            : '/rejoindre-campagne';
          router.push(redirectUrl);
        } else {
          // If auto-login fails, redirect to login page
          router.push('/connexion?registered=true');
        }
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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Inscription vendeur</h1>
              <p className="text-blue-100">Créez votre compte en 30 secondes</p>
              {(campaignId || (typeof window !== 'undefined' && sessionStorage.getItem('joinCampaignId'))) && (
                <div className="mt-4 p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <p className="text-sm">
                    <strong>✅ Campagne détectée :</strong> Vous rejoindrez automatiquement votre campagne !
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8">
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

            {/* Ultra-Simple Form - Only 3 fields */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Prénom */}
              <div>
                <Label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom complet
                </Label>
                <Input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Ex: Jean Bon"
                  className="w-full py-4 px-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 text-base"
                  required
                  autoComplete="given-name"
                  autoFocus
                />
              </div>

              {/* Email with Interac notice */}
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse email
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full py-4 px-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-base ${emailExists ? 'border-red-300 bg-red-50' :
                      formData.email && !emailExists ? 'border-green-300 bg-green-50' :
                        'border-gray-300 hover:border-gray-400'
                      }`}
                    placeholder="votreemail@exemple.com"
                    required
                    autoComplete="email"
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

                {/* Interac Notice - Clear and visible */}
                <div className="mt-2 flex items-start gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <Banknote className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">💰 Vos virements interac</span> seront envoyés à cette adresse email
                  </p>
                </div>
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="motDePasse"
                    name="motDePasse"
                    value={formData.motDePasse}
                    onChange={handleChange}
                    placeholder="Mot de passe"
                    className="w-full py-4 px-4 pr-12 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 text-base"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || emailExists}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none mt-6"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Inscription en cours...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Créer mon compte
                  </div>
                )}
              </Button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Déjà inscrit ?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/connexion')}
                  className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                >
                  Se connecter
                </button>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
