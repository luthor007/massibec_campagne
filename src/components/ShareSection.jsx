import { useState, useEffect } from 'react'
import { Facebook, Twitter, Mail, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'


export default function ShareSection({ isOwner, ownerName }) {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Erreur lors de la copie du lien:', err)
      })
  }

  const shareButtons = [
    {
      name: 'Facebook',
      icon: <Facebook className="h-4 w-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Twitter',
      icon: <Twitter className="h-4 w-4" />,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent('Découvrez cette boutique!')}`,
      color: 'bg-sky-500 hover:bg-sky-600',
    },
    {
      name: 'Email',
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encodeURIComponent('Découvrez cette boutique')}&body=${encodeURIComponent(`Visitez cette boutique: ${currentUrl}`)}`,
      color: 'bg-green-600 hover:bg-green-700',
    },
  ]

  return (
    <Card className="mt-4 overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardTitle className="text-lg font-semibold">
          {isOwner ? 'Partager ma boutique' : `Partager la boutique de ${ownerName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <motion.div 
          className="grid grid-cols-3 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {shareButtons.map((button) => (
            <TooltipProvider key={button.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                <Link
  href={button.href}
  target="_blank"
  rel="noopener noreferrer"
  className={`w-full ${button.color} text-white border-none flex items-center justify-center p-2 rounded-md`}
>
  {button.icon}
  <span className="ml-2 hidden sm:inline">{button.name}</span>
</Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Partager sur {button.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </motion.div>
        <motion.div 
          className="flex items-center space-x-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Input 
            readOnly 
            value={currentUrl} 
            className="flex-grow bg-white"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={copyToClipboard}
                  className={`min-w-[100px] ${isCopied ? 'bg-green-500 text-white' : 'bg-white'}`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isCopied ? (
                      <motion.div
                        key="check"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Copié!
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Copier
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCopied ? 'Lien copié!' : 'Copier le lien'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      </CardContent>
    </Card>
  )
}