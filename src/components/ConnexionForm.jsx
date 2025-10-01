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
  const [formData, setFormData] = useState({
    email: '',
    motDePasse: '',
  })
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const result = await signIn('credentials', {
        redirect: false, // Prevent automatic redirection by next-auth
        email: formData.email,
        password: formData.motDePasse,
      })

      if (result.error) {
        alert('Erreur de connexion: ' + result.error)
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
            alert('Veuillez vérifier votre e-mail avant de vous connecter');
            await signOut({ callbackUrl: '/resend-verification' });
            return; // Exit early to prevent further execution
          }

          // Redirect based on the user role
          if (userRole === 'school_manager') {
            router.push('/dashboard-manager');
          } else {
            router.push('/dashboard');
          }
        } else {
          throw new Error('Unable to fetch user role');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue lors de la connexion');
    }
  }

  return (
    <>
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
        className={`
          relative overflow-hidden transition-all duration-300 ease-out
          transform hover:scale-105 hover:shadow-lg
          bg-gradient-to-r from-blue-500 to-indigo-600
          text-white font-semibold py-3 px-6 rounded-full
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.span
          className="relative z-10 flex items-center space-x-2"
          animate={{ x: isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <LogIn className="w-5 h-5" />
          <span>Se connecter</span>
        </motion.span>
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: isHovered ? 1.5 : 0, opacity: isHovered ? 0.15 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ borderRadius: '100%', zIndex: 0 }}
        />
      </Button>
    </motion.div>
      </form>
      <p className="mt-4 text-center">
          <Link  href="/forgot-password" className="text-blue-500 hover:underline">Mot de passe oublié ?</Link>

      </p>
      </>
  )
}