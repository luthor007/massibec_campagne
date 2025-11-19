// pages/login.jsx

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'

import { motion } from 'framer-motion'

import { LogIn } from 'lucide-react'

export default function ConnexionForm() {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    motDePasse: '',
  })
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
    if (resendSuccess) {
      setResendSuccess('')
    }
  }

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Veuillez entrer votre adresse e-mail d\'abord.')
      return
    }

    setIsResendingEmail(true)
    setError('')
    setResendSuccess('')

    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResendSuccess('Un nouvel e-mail de vérification a été envoyé!')
      } else {
        setError(data.message || 'Erreur lors de l\'envoi de l\'e-mail de vérification.')
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'e-mail de vérification:', error)
      setError('Erreur lors de l\'envoi de l\'e-mail de vérification.')
    } finally {
      setIsResendingEmail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false, // Prevent automatic redirection by next-auth
        email: formData.email,
        password: formData.motDePasse,
      })

      if (result.error) {
        // Handle specific error messages
        if (result.error === 'EMAIL_NOT_FOUND') {
          setError('Aucun compte trouvé avec cette adresse e-mail.')
        } else if (result.error === 'INVALID_PASSWORD') {
          setError('Mot de passe incorrect.')
        } else {
          setError('Erreur de connexion. Veuillez réessayer.')
        }
        setIsLoading(false)
        return
      } else {
        // After successful sign-in, fetch the user’s role from the backend
        const response = await fetch('/api/get-user-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (response.ok) {
          const data = await response.json();
          const userRole = data.user.role;
          const emailVerified = data.user.emailVerified;
          console.log("Here is email verified")
          console.log(emailVerified)
          console.log(data)

          if (!emailVerified) {
            setError('Veuillez vérifier votre e-mail avant de vous connecter');
            setIsLoading(false)
            await signOut({ callbackUrl: '/resend-verification' });
            return; // Exit early to prevent further execution
          }

          // Track login
          const { trackLogin } = await import('@/lib/funnelAnalytics');
          const userType = userRole === 'student' ? 'student' : userRole === 'school_manager' ? 'school' : 'anonymous';
          // Check if this is a returning user (has previous login events)
          const isReturning = data.user.createdAt && new Date(data.user.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000;
          trackLogin(data.user._id, userType, isReturning);

          // Redirect based on the user role
          if (userRole === 'school_manager') {
            router.push('/dashboard-manager');
          } else if (userRole === 'fournisseur') {
            router.push('/dashboard-massibec');
          } else {
            router.push('/dashboard');
          }
        } else {
          throw new Error('Unable to fetch user role');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
          {error === 'Veuillez vérifier votre e-mail avant de vous connecter' && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingEmail}
                className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResendingEmail ? 'Envoi en cours...' : 'Renvoyer l\'e-mail de vérification'}
              </button>
            </div>
          )}
        </div>
      )}
      {resendSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">{resendSuccess}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="motDePasse">Mot de passe</Label>
          <Input
            type="password"
            id="motDePasse"
            name="motDePasse"
            value={formData.motDePasse}
            onChange={handleChange}
            required
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="default"
            size="lg"
            type="submit"
            disabled={isLoading}
            className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        `}
            onMouseEnter={() => !isLoading && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <motion.span
              className="relative z-10 flex items-center space-x-2"
              animate={{ x: isHovered && !isLoading ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Se connecter</span>
                </>
              )}
            </motion.span>
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: isHovered && !isLoading ? 1.5 : 0, opacity: isHovered && !isLoading ? 0.15 : 0 }}
              transition={{ duration: 0.3 }}
              style={{ borderRadius: '100%', zIndex: 0 }}
            />
          </Button>
        </motion.div>
      </form>
      <p className="mt-4 text-center">
        <Link href="/forgot-password" className="text-blue-500 hover:underline">Mot de passe oublié ?</Link>

      </p>
    </>
  )
}