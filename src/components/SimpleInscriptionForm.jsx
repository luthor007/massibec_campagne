import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Mail, Lock, User, ArrowRight, Sparkles, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackSchoolRegistrationStarted, trackSchoolRegistrationCompleted } from '@/lib/funnelAnalytics';

export default function SimpleInscriptionForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const hasTrackedStarted = useRef(false);
  const [formData, setFormData] = useState({
    nomComplet: '',
    email: '',
    motDePasse: '',
    confirmationMotDePasse: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Track registration started on first interaction
    if (!hasTrackedStarted.current) {
      hasTrackedStarted.current = true;
      trackSchoolRegistrationStarted();
    }
  };

  // Email validation
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email && formData.email.includes('@')) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    // Basic validation
    if (!formData.nomComplet || !formData.email || !formData.motDePasse || !formData.confirmationMotDePasse) {
      setErrorMessage('Veuillez remplir tous les champs requis.');
      setIsSubmitting(false);
      return;
    }

    if (formData.motDePasse !== formData.confirmationMotDePasse) {
      setErrorMessage('Les mots de passe ne correspondent pas');
      setIsSubmitting(false);
      return;
    }

    if (emailExists) {
      setErrorMessage('Cette adresse e-mail est déjà utilisée');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/inscription-manager-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Track registration completion
        trackSchoolRegistrationCompleted(formData.email);

        // Store email in sessionStorage for email verification page
        sessionStorage.setItem('pendingVerificationEmail', formData.email.toLowerCase().trim());
        router.push('/email-verification');
      } else {
        const errorData = await response.json();
        console.error('Registration error:', errorData);
        setErrorMessage(errorData.message || 'Erreur lors de la création du compte');

        // If it's an email already exists error, update the emailExists state
        if (errorData.message?.includes('déjà utilisée') || errorData.message?.includes('already exists')) {
          setEmailExists(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ouvrez un compte gratuitement
          </h1>
          <p className="text-gray-600 text-lg">
            Obtenez toutes les informations et commencez votre campagne de financement
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom complet */}
            <div>
              <Label htmlFor="nomComplet" className="text-sm font-semibold text-gray-700 mb-2 block">
                Nom complet
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <User className="h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                <Input
                  type="text"
                  id="nomComplet"
                  name="nomComplet"
                  value={formData.nomComplet}
                  onChange={handleChange}
                  className="!pl-12 pr-3 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  placeholder="Votre nom complet"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
                Adresse e-mail
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Mail className="h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`!pl-12 pr-10 h-12 border-2 rounded-xl focus:ring-2 transition-all duration-200 ${emailExists ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' :
                    formData.email && !emailExists ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200' :
                      'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                  placeholder="votre@email.com"
                  required
                />
                {isCheckingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {!isCheckingEmail && formData.email && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailExists ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                )}
              </div>
              {emailExists && (
                <p className="text-sm text-red-500 mt-1">
                  Cette adresse e-mail est déjà utilisée
                </p>
              )}
              <div className="flex items-start space-x-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Cet email sera utilisé pour les transferts Interac et les communications.
                </p>
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <Label htmlFor="motDePasse" className="text-sm font-semibold text-gray-700 mb-2 block">
                Mot de passe
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Lock className="h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                <Input
                  type="password"
                  id="motDePasse"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  className="!pl-12 pr-3 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <Label htmlFor="confirmationMotDePasse" className="text-sm font-semibold text-gray-700 mb-2 block">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Lock className="h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                <Input
                  type="password"
                  id="confirmationMotDePasse"
                  name="confirmationMotDePasse"
                  value={formData.confirmationMotDePasse}
                  onChange={handleChange}
                  className="!pl-12 pr-3 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`
                w-full h-14 text-lg font-semibold rounded-xl
                bg-gradient-to-r from-blue-600 to-purple-600 
                hover:from-blue-700 hover:to-purple-700
                text-white shadow-lg hover:shadow-xl
                transform transition-all duration-200 ease-in-out
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                disabled:hover:scale-100 disabled:hover:shadow-lg
                ${isSubmitting ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center justify-center space-x-3">
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Création du compte...</span>
                  </>
                ) : (
                  <>
                    <span>Ouvrir un compte gratuitement</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </div>
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/connexion" className="text-blue-600 hover:text-blue-700 font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/50 rounded-xl">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Gratuit</h3>
            <p className="text-sm text-gray-600">Aucun frais d'inscription</p>
          </div>
          <div className="text-center p-4 bg-white/50 rounded-xl">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Rapide</h3>
            <p className="text-sm text-gray-600">Configuration en quelques minutes</p>
          </div>
          <div className="text-center p-4 bg-white/50 rounded-xl">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <ArrowRight className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Flexible</h3>
            <p className="text-sm text-gray-600">Complétez votre profil plus tard</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
