import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/router'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Mail, User, Home, CheckCircle, AlertCircle, X, Sparkles, Star } from 'lucide-react'

export default function MultiStepInscriptionForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  
  const [formData, setFormData] = useState({
    // Step 1: Email & Basic Info
    email: '',
    prenom: '',
    nom: '',
    motDePasse: '',
    confirmationMotDePasse: '',
    
    // Step 2: School Info
    schoolCode: '',
    objectifPersonnel: '',
    
    // Step 3: Parent Info
    nomParent: '',
    prenomParent: '',
    adresse: '',
    app: '',
    ville: '',
    province: '',
    codePostal: '',
    telephone: ''
  })

  const [school, setSchool] = useState(null)

  const steps = [
    { id: 1, title: 'Informations de base', icon: User },
    { id: 2, title: 'École & Objectif', icon: Home },
    { id: 3, title: 'Informations parent', icon: User }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
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
        if (!formData.schoolCode || !formData.objectifPersonnel) {
          setErrorMessage('Veuillez remplir tous les champs obligatoires')
          return false
        }
        if (!school) {
          setErrorMessage('Code d\'école invalide')
          return false
        }
        return true
        
      case 3:
        if (!formData.nomParent || !formData.prenomParent || !formData.adresse || !formData.ville || !formData.province || !formData.codePostal || !formData.telephone) {
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
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setErrorMessage('')
  }

  // Fetch school data
  useEffect(() => {
    const fetchSchool = async () => {
      if (formData.schoolCode) {
        try {
          const response = await fetch(`/api/school-from-code?code=${formData.schoolCode}`)
          if (response.ok) {
            const schoolData = await response.json()
            setSchool(schoolData)
          } else {
            setSchool(null)
          }
        } catch (error) {
          console.error('Error fetching school:', error)
          setSchool(null)
        }
      }
    }

    fetchSchool()
  }, [formData.schoolCode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(3)) return
    
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.prenom} ${formData.nom}`,
          email: formData.email,
          password: formData.motDePasse,
          schoolId: school._id,
          objectifPersonnel: parseInt(formData.objectifPersonnel),
          parentInfo: {
            nomParent: formData.nomParent,
            prenomParent: formData.prenomParent,
            adresse: formData.adresse,
            app: formData.app,
            ville: formData.ville,
            province: formData.province,
            codePostal: formData.codePostal,
            telephone: formData.telephone,
          }
        }),
      })

      if (response.ok) {
        router.push('/email-verification')
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
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Créer votre compte</h2>
              <p className="text-gray-600 text-lg">Commençons par vos informations de base</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Adresse e-mail *
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pr-12 py-3 text-base rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 ${
                      emailExists ? 'border-red-400 bg-red-50' : 
                      formData.email && !emailExists ? 'border-green-400 bg-green-50' : 
                      'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="votre@email.com"
                    required
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {!isCheckingEmail && formData.email && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      {emailExists ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="prenom" className="text-sm font-semibold text-gray-700">Prénom *</Label>
                  <Input
                    type="text"
                    id="prenom"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Votre prénom"
                    className="py-3 text-base rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="nom" className="text-sm font-semibold text-gray-700">Nom *</Label>
                  <Input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="py-3 text-base rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="motDePasse" className="text-sm font-semibold text-gray-700">Mot de passe *</Label>
                <Input
                  type="password"
                  id="motDePasse"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  className="py-3 text-base rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmationMotDePasse" className="text-sm font-semibold text-gray-700">Confirmer le mot de passe *</Label>
                <Input
                  type="password"
                  id="confirmationMotDePasse"
                  name="confirmationMotDePasse"
                  value={formData.confirmationMotDePasse}
                  onChange={handleChange}
                  placeholder="Répétez votre mot de passe"
                  className={`py-3 text-base rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 ${
                    formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse 
                      ? 'border-red-400 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                  }`}
                  required
                />
                {formData.confirmationMotDePasse && formData.motDePasse !== formData.confirmationMotDePasse && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
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
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
                <Home className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Votre école</h2>
              <p className="text-gray-600 text-lg">Indiquez votre école et votre objectif personnel</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolCode">Code d'identification de l'école *</Label>
                <Input
                  type="text"
                  id="schoolCode"
                  name="schoolCode"
                  value={formData.schoolCode}
                  onChange={handleChange}
                  placeholder="Entrez le code fourni par votre école"
                  required
                />
                {school && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>École trouvée:</strong> {school.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectifPersonnel">Objectif personnel de vente *</Label>
                <Select value={formData.objectifPersonnel} onValueChange={(value) => setFormData(prev => ({ ...prev, objectifPersonnel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre objectif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 produits</SelectItem>
                    <SelectItem value="15">15 produits</SelectItem>
                    <SelectItem value="20">20 produits</SelectItem>
                    <SelectItem value="25">25 produits</SelectItem>
                    <SelectItem value="30">30 produits</SelectItem>
                    <SelectItem value="35">35 produits</SelectItem>
                    <SelectItem value="40">40 produits</SelectItem>
                    <SelectItem value="45">45 produits</SelectItem>
                    <SelectItem value="50">50 produits</SelectItem>
                    <SelectItem value="60">60 produits</SelectItem>
                    <SelectItem value="70">70 produits</SelectItem>
                    <SelectItem value="80">80 produits</SelectItem>
                    <SelectItem value="90">90 produits</SelectItem>
                    <SelectItem value="100">100 produits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Informations parent</h2>
              <p className="text-gray-600 text-lg">Dernière étape ! Informations du parent responsable</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenomParent">Prénom du parent *</Label>
                  <Input
                    type="text"
                    id="prenomParent"
                    name="prenomParent"
                    value={formData.prenomParent}
                    onChange={handleChange}
                    placeholder="Prénom du parent"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomParent">Nom du parent *</Label>
                  <Input
                    type="text"
                    id="nomParent"
                    name="nomParent"
                    value={formData.nomParent}
                    onChange={handleChange}
                    placeholder="Nom du parent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse *</Label>
                <Input
                  type="text"
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Numéro et nom de rue"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app">Appartement</Label>
                  <Input
                    type="text"
                    id="app"
                    name="app"
                    value={formData.app}
                    onChange={handleChange}
                    placeholder="Apt, suite, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    type="text"
                    id="ville"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    placeholder="Ville"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Select value={formData.province} onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QC">Québec</SelectItem>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="BC">Colombie-Britannique</SelectItem>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="MB">Manitoba</SelectItem>
                      <SelectItem value="SK">Saskatchewan</SelectItem>
                      <SelectItem value="NS">Nouvelle-Écosse</SelectItem>
                      <SelectItem value="NB">Nouveau-Brunswick</SelectItem>
                      <SelectItem value="NL">Terre-Neuve-et-Labrador</SelectItem>
                      <SelectItem value="PE">Île-du-Prince-Édouard</SelectItem>
                      <SelectItem value="YT">Yukon</SelectItem>
                      <SelectItem value="NT">Territoires du Nord-Ouest</SelectItem>
                      <SelectItem value="NU">Nunavut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal *</Label>
                  <Input
                    type="text"
                    id="codePostal"
                    name="codePostal"
                    value={formData.codePostal}
                    onChange={handleChange}
                    placeholder="A1A 1A1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    type="tel"
                    id="telephone"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 text-white">
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 mr-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Inscription élève</h1>
                <p className="text-blue-100">Rejoignez la campagne de financement Massibec</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-8 py-6 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex flex-col items-center relative">
                  <motion.div 
                    className={`
                      w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-300 shadow-lg
                      ${isActive ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110' : 
                        isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 
                        'bg-white text-gray-400 border-2 border-gray-200'}
                    `}
                    whileHover={{ scale: isActive ? 1.1 : 1.05 }}
                  >
                    {isCompleted ? <CheckCircle className="h-7 w-7" /> : <Icon className="h-7 w-7" />}
                  </motion.div>
                  <span className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                  
                  {/* Connection line */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-7 left-1/2 w-full h-0.5 bg-gray-200 -z-10">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          currentStep > step.id ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-200'
                        }`}
                        style={{ width: currentStep > step.id ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Progress percentage */}
          <div className="text-center">
            <span className="text-sm text-gray-600">
              Étape {currentStep} sur {steps.length} • {Math.round((currentStep / steps.length) * 100)}% complété
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          {/* Error Message */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-md mb-6 flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </motion.div>
          )}

          {/* Form Content */}
          <form onSubmit={currentStep === 3 ? handleSubmit : (e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </form>
        </div>

        {/* Footer with Navigation */}
        <div className="bg-gray-50 px-8 py-6 border-t">
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 hover:bg-gray-100 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Déjà inscrit ?{' '}
                <button
                  onClick={() => router.push('/connexion')}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Se connecter
                </button>
              </p>
            </div>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Inscription en cours...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4" />
                    Finaliser l'inscription
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
