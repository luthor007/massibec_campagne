import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Facebook, Instagram, Mail, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'


export default function ShareSection({ isOwner, ownerName, deliveryDate, schoolName }) {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [isMessageCopied, setIsMessageCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get base URL without existing source parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('source'); // Remove existing source if any
      setCurrentUrl(url.toString());
    }
  }, [])

  // Helper function to add source parameter to URL
  const addSourceToUrl = (url, source) => {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('source', source);
      return urlObj.toString();
    } catch {
      // Fallback if URL parsing fails
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}source=${source}`;
    }
  }

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return 'la date de livraison'
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long'
    })
  }

  const getFirstName = (fullName) => {
    if (!fullName) return null
    const nameParts = fullName.trim().split(' ')
    return nameParts[0] || null
  }

  const getShareMessage = () => {
    if (isOwner) {
      return `🎉 Bonjour chers amis !
Je participe à la campagne de financement de l'école de mon enfant avec les produits Jappuie.ca.
Vous pouvez commander en ligne leurs délicieux pâtés à la viande et au poulet (exclusifs aux campagnes de financement) ainsi que leurs fameuses tartes.

👉 Une partie des profits va pour les activités scolaires de l'école et une autre directement aux activités pour mon enfant.
👉 Paiements simples et sécuritaires par Interac.
👉 Profitez d'un rabais de 5 % à l'achat de 6 produits.

Merci de communiquer avec moi pour prévoir la livraison le ${formatDeliveryDate(deliveryDate)}, puis passez votre commande directement sur ma boutique :
${currentUrl}

🙏 Merci pour votre soutien et votre participation !`
    } else {
      const firstName = getFirstName(ownerName) || 'cet élève'
      const school = schoolName || 'son école'
      return `${firstName} fait une campagne de financement avec ${school}. Soutenez-le et régalez-vous avec les produits de fournisseurs 100% québécois de Jappuie.ca !

Commandez directement sur la boutique :
${currentUrl}

On l'encourage !`
    }
  }

  const copyLink = () => {
    // When copying link directly, use 'link' as source
    const urlWithSource = addSourceToUrl(currentUrl, 'link');
    navigator.clipboard.writeText(urlWithSource)
      .then(() => {
        setIsLinkCopied(true)
        toast.success('Lien copié!')
        setTimeout(() => setIsLinkCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Erreur lors de la copie du lien:', err)
        toast.error('Erreur lors de la copie')
      })
  }

  const copyMessage = () => {
    const message = getShareMessage()
    navigator.clipboard.writeText(message)
      .then(() => {
        setIsMessageCopied(true)
        toast.success('Message copié!')
        setTimeout(() => setIsMessageCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Erreur lors de la copie du message:', err)
        toast.error('Erreur lors de la copie')
      })
  }

  const shareButtons = [
    {
      name: 'Facebook',
      icon: <Facebook className="h-4 w-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(addSourceToUrl(currentUrl, 'facebook'))}&quote=${encodeURIComponent(getShareMessage())}`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Instagram',
      icon: <Instagram className="h-4 w-4" />,
      href: `https://www.instagram.com/`,
      color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600',
      onClick: (e) => {
        e.preventDefault();
        const messageWithSource = getShareMessage().replace(currentUrl, addSourceToUrl(currentUrl, 'instagram'));
        navigator.clipboard.writeText(messageWithSource);
        toast.success('Message copié! Collez-le dans votre story ou publication Instagram.');
      }
    },
    {
      name: 'Email',
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encodeURIComponent(isOwner ? 'Campagne de financement Jappuie.ca' : 'Découvrez cette boutique')}&body=${encodeURIComponent(getShareMessage().replace(currentUrl, addSourceToUrl(currentUrl, 'email')))}`,
      color: 'bg-green-600 hover:bg-green-700',
    },
  ]

  return (
    <Card className="mt-4 overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg rounded-xl border-0">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-5">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          {isOwner ? 'Partager ma boutique' : `Partager la boutique de ${ownerName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 sm:p-6">
        <motion.div
          className="grid grid-cols-3 gap-2 sm:gap-3 mb-4"
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
                      className={`w-full ${button.color} text-white border-none flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all hover:scale-105 shadow-sm`}
                    >
                      {button.icon}
                      <span className="mt-1.5 text-xs sm:text-sm font-medium">{button.name}</span>
                    </button>
                  ) : (
                    <Link
                      href={button.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full ${button.color} text-white border-none flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all hover:scale-105 shadow-sm`}
                    >
                      {button.icon}
                      <span className="mt-1.5 text-xs sm:text-sm font-medium">{button.name}</span>
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
          {/* Copy Link Button */}
          <Button
            onClick={copyLink}
            className={`w-full ${isLinkCopied ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            size="lg"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLinkCopied ? (
                <motion.div
                  key="check-link"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  <span className="text-sm sm:text-base font-semibold">Lien copié!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy-link"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center gap-2"
                >
                  <LinkIcon className="h-5 w-5" />
                  <span className="text-sm sm:text-base font-semibold">Copier le lien</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Copy Message Button */}
          <Button
            onClick={copyMessage}
            className={`w-full ${isMessageCopied ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            size="lg"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMessageCopied ? (
                <motion.div
                  key="check-message"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  <span className="text-sm sm:text-base font-semibold">Message copié!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy-message"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-sm sm:text-base font-semibold">Copier le message</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Message Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <p className="text-xs sm:text-sm text-blue-800 font-medium mb-2">Aperçu du message :</p>
            <p className="text-xs text-blue-700 whitespace-pre-line leading-relaxed break-words">
              {getShareMessage()}
            </p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}