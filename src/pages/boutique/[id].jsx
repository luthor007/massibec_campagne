import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Layout from '../../components/Layout'
import ProductList from '../../components/ProductList'
import Cart from '../../components/Cart'
import { ArrowLeft, ShoppingBag, Percent } from 'lucide-react'
import Link from 'next/link'
import ShareSection from '../../components/ShareSection'
import StoreInfoCard from '../../components/StoreInfoCard'
import { motion } from 'framer-motion'
import { Progress } from "@/components/ui/progress"

export default function Boutique() {
  const router = useRouter()
  const { id } = router.query
  const { data: session } = useSession()

  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolId, setSchoolId] = useState()
  const [orderDeadline, setOrderDeadline] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [cartItemCount, setCartItemCount] = useState(0)
  const [discountProgress, setDiscountProgress] = useState(0)
  const [currentDiscount, setCurrentDiscount] = useState(0)

  useEffect(() => {
    if (id) {
      fetchStoreData()
    }
    updateCartItemCount()
    window.addEventListener('storage', updateCartItemCount)
    return () => window.removeEventListener('storage', updateCartItemCount)
  }, [id, session])

  const fetchStoreData = async () => {
    try {
      const response = await fetch(`/api/stores/${id}`)
      if (response.ok) {
        const data = await response.json()
        setStoreName(data.name)
        setStoreDescription(data.description)
        setIsOwner(session && data.ownerId === session.user.id)

        const ownerResponse = await fetch(`/api/users/${data.ownerId}`)
        if (ownerResponse.ok) {
          const ownerData = await ownerResponse.json()
          setOwnerName(ownerData.name)
          setOwnerEmail(ownerData.email)
          setOwnerPhone(ownerData.parentInfo?.telephone || '')

          if (ownerData.school) {
            const schoolResponse = await fetch(`/api/schools/${ownerData.school}`)
            if (schoolResponse.ok) {
              const schoolData = await schoolResponse.json()
              setSchoolName(schoolData.name)
              setSchoolId(ownerData.school)
              setOrderDeadline(schoolData.finCampagne)
              setDeliveryDate(schoolData.dateDeLivraison)
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error)
    }
  }

  const updateCartItemCount = () => {
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    setCartItemCount(totalItems)
    updateDiscountProgress(totalItems)
  }

  const updateDiscountProgress = (itemCount) => {
    if (itemCount >= 12) {
      setDiscountProgress(100)
      setCurrentDiscount(10)
    } else if (itemCount >= 6) {
      setDiscountProgress(100)
      setCurrentDiscount(5)
    } else if (itemCount < 6) {
      setCurrentDiscount(0)
    } else if (itemCount < 12 && itemCount >= 6) {
      setCurrentDiscount(5)
    } else {
      setDiscountProgress((itemCount / 6) * 100)
      setCurrentDiscount(0)
    }
  }

  const content =       <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-safe">
  {isOwner && (
    <div className="sticky top-0 z-10 bg-white pt-2 pb-4">
      <Link href="/dashboard" passHref>
        <motion.div
          className="inline-flex items-center text-blue-600 hover:text-blue-800 cursor-pointer text-sm sm:text-base"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Retour au tableau de bord
        </motion.div>
      </Link>
    </div>
  )}

  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="mb-4 sm:mb-6 lg:mb-8"
  >
    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">{storeName}</h1>
    <p className="text-base sm:text-lg lg:text-xl text-gray-600">{storeDescription}</p>
  </motion.div>

{/* 
  <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg shadow-md">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center">
        <ShoppingBag className="h-6 w-6 text-blue-500 mr-2" />
        <span className="font-semibold text-blue-800">
          {cartItemCount} produit{cartItemCount !== 1 ? 's' : ''} dans votre panier
        </span>
      </div>
      <div className="flex items-center">
        <Percent className="h-6 w-6 text-green-500 mr-2" />
        <span className="font-semibold text-green-700">{currentDiscount}% de réduction</span>
      </div>
    </div>
    <Progress value={discountProgress} className="h-2 mb-2" />
    <p className="text-sm text-blue-700">
      {discountProgress < 100
        ? `Ajoutez ${6 - cartItemCount} produit${6 - cartItemCount !== 1 ? 's' : ''} de plus pour obtenir 5% de réduction!`
        : currentDiscount === 5
        ? "Ajoutez 6 produits de plus pour obtenir 10% de réduction!"
        : "Félicitations! Vous bénéficiez de la réduction maximale de 10%!"}
    </p>
  </div>
  */}

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
    <div className="lg:col-span-2 order-2 lg:order-1">
      {schoolId ? (
        <div className="overflow-y-auto">
        <ProductList schoolId={schoolId} />
        </div>
      ) : (
        <p className="text-gray-600 text-center py-8">Chargement des produits...</p>
      )}
    </div>
    <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8 order-1 lg:order-2">
      <Cart id={id} />
      
      <StoreInfoCard
        orderDeadline={orderDeadline}
        deliveryDate={deliveryDate}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        ownerPhone={ownerPhone}
        schoolName={schoolName}
      />
      <ShareSection 
        isOwner={isOwner} 
        ownerName={ownerName} 
        deliveryDate={deliveryDate}
        schoolName={schoolName}
      />
    </div>
  </div>
</div>

  

return isOwner ? (
  <Layout>
    {content}
  </Layout>
) : (
  content
)
}