import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Facebook, Instagram, Mail, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'


export default function ShareSection({ isOwner, ownerName, deliveryDate, schoolName }) {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return 'la date de livraison'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long'
    })
  }

  const getShareMessage = () => {
    if (isOwner) {
      return `🎉 Bonjour chers amis !
Je participe à la campagne de financement de l'école de mon enfant avec les produits Massibec.
Vous pouvez commander en ligne leurs délicieux pâtés à la viande et au poulet (exclusifs aux campagnes de financement) ainsi que leurs fameuses tartes.

👉 Une partie des profits va pour les activités scolaires de l'école et une autre directement aux activités pour mon enfant.
👉 Paiements simples et sécuritaires par Interac.
👉 Profitez d'un rabais de 5 % à l'achat de 6 produits.

Merci de communiquer avec moi pour prévoir la livraison le ${formatDeliveryDate(deliveryDate)}, puis passez votre commande directement sur ma boutique :
${currentUrl}

🙏 Merci pour votre soutien et votre participation !`
    } else {
      return `Découvrez cette boutique: ${currentUrl}`
    }
  }

  const copyToClipboard = () => {
    const message = getShareMessage()
    navigator.clipboard.writeText(message)
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
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(getShareMessage())}`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Instagram',
      icon: <Instagram className="h-4 w-4" />,
      href: `https://www.instagram.com/`,
      color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600',
      onClick: (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(getShareMessage());
        toast.success('Message copié! Collez-le dans votre story ou publication Instagram.');
      }
    },
    {
      name: 'Email',
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encodeURIComponent(isOwner ? 'Campagne de financement Massibec' : 'Découvrez cette boutique')}&body=${encodeURIComponent(getShareMessage())}`,
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
                {button.onClick ? (
                  <button
                    onClick={button.onClick}
                    className={`w-full ${button.color} text-white border-none flex items-center justify-center p-2 rounded-md cursor-pointer`}
                  >
                    {button.icon}
                    <span className="ml-2 hidden sm:inline">{button.name}</span>
                  </button>
                ) : (
                  <Link
                    href={button.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full ${button.color} text-white border-none flex items-center justify-center p-2 rounded-md`}
                  >
                    {button.icon}
                    <span className="ml-2 hidden sm:inline">{button.name}</span>
                  </Link>
                )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>Partager sur {button.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </motion.div>
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center space-x-2">
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
                          {isOwner ? 'Copier message' : 'Copier lien'}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCopied ? (isOwner ? 'Message copié!' : 'Lien copié!') : (isOwner ? 'Copier le message' : 'Copier le lien')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {isOwner && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">Message de partage :</p>
              <p className="text-xs text-blue-700 whitespace-pre-line leading-relaxed">
                {getShareMessage()}
              </p>
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  )
}