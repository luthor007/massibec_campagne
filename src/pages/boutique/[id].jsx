import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Layout from '../../components/Layout'
import ProductList from '../../components/ProductList'
import Cart from '../../components/Cart'
import StickyCartMobile from '../../components/StickyCartMobile'
import { ArrowLeft, ShoppingBag, Percent, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ShareSection from '../../components/ShareSection'
import StoreInfoCard from '../../components/StoreInfoCard'
import { motion } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import useOnboarding from '../../hooks/useOnboarding'
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip'
import { toast } from 'sonner'
import { isTestCampaign } from '../../utils/campaignHelpers'

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
  const [campaignId, setCampaignId] = useState()
  const [campaignData, setCampaignData] = useState(null)
  const [orderDeadline, setOrderDeadline] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [cartItemCount, setCartItemCount] = useState(0)
  const [discountProgress, setDiscountProgress] = useState(0)
  const [currentDiscount, setCurrentDiscount] = useState(0)

  // Onboarding states
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(false)
  const [tooltipTarget, setTooltipTarget] = useState(null)
  const [testOrderCreated, setTestOrderCreated] = useState(false)
  const [showTestDataModal, setShowTestDataModal] = useState(false)

  // Onboarding
  const { 
    currentStep, 
    progress, 
    isLoading: onboardingLoading, 
    isCompleted, 
    markStepComplete, 
    getStepContent 
  } = useOnboarding()

  // Update cart item count from localStorage
  const updateCartItemCount = () => {
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    setCartItemCount(totalItems)
    
    // Calculate discount progress
    if (totalItems >= 6) {
      setCurrentDiscount(5)
      setDiscountProgress(100)
    } else {
      setCurrentDiscount(0)
      setDiscountProgress((totalItems / 6) * 100)
    }
  }

  useEffect(() => {
    if (id) {
      fetchStoreData()
    }
    updateCartItemCount()
    window.addEventListener('storage', updateCartItemCount)
    return () => window.removeEventListener('storage', updateCartItemCount)
  }, [id, session])

  // Onboarding logic for store page
  useEffect(() => {
    if (!onboardingLoading && currentStep && !isCompleted) {
      // Show onboarding tooltip when current step is available
      const timer = setTimeout(() => {
        setShowOnboardingTooltip(true);
        
        // Set tooltip target based on current step
        switch (currentStep.key) {
          case 'visitedStore':
            // Highlight the first product or a general area
            setTooltipTarget(document.querySelector('.product-card') || document.querySelector('.grid'));
            break;
          case 'viewedOrders':
            // This will be handled after test order creation
            break;
          default:
            setTooltipTarget(null);
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setShowOnboardingTooltip(false);
    }
  }, [currentStep, onboardingLoading, isCompleted]);

  // Guide student to make a real order
  useEffect(() => {
    if (!onboardingLoading && currentStep?.key === 'visitedStore' && !isCompleted) {
      // Wait for products to load, then highlight first product
      const timer = setTimeout(() => {
        const firstProduct = document.querySelector('.product-card') || document.querySelector('[data-testid="product-card"]');
        if (firstProduct) {
          setTooltipTarget(firstProduct);
          setShowOnboardingTooltip(true);
        }
      }, 2000); // Wait 2 seconds for products to load
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, onboardingLoading, isCompleted]);

  // Highlight elements based on onboarding step
  useEffect(() => {
    if (!onboardingLoading && currentStep && !isCompleted) {
      const highlightElement = (selector, className = 'ring-4 ring-blue-500 ring-opacity-75') => {
        const element = document.querySelector(selector);
        if (element) {
          element.classList.add(className);
          return element;
        }
        return null;
      };

      const removeHighlights = () => {
        document.querySelectorAll('.ring-4').forEach(el => {
          el.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-75');
        });
      };

      switch (currentStep.key) {
        case 'visitedStore':
          // Highlight first product's "Add to cart" button
          setTimeout(() => {
            removeHighlights();
            const addButton = highlightElement('[data-testid="add-to-cart"]') || highlightElement('.product-card:first-child button');
            if (addButton) {
              setTooltipTarget(addButton);
              setShowOnboardingTooltip(true);
            }
          }, 1000);
          break;
        case 'viewedOrders':
          // This will be handled after order completion
          break;
        default:
          removeHighlights();
      }
    }
  }, [currentStep, onboardingLoading, isCompleted]);

  // Onboarding handlers
  const handleOnboardingNext = async () => {
    if (currentStep?.key === 'visitedStore') {
      // Don't auto-complete, let student make the order
      // Just hide the tooltip for now
      setShowOnboardingTooltip(false);
      
      // Show a message encouraging them to add to cart
      toast.info('Parfait ! Maintenant ajoutez un produit à votre panier en cliquant sur le bouton "Ajouter au panier".');
    } else if (currentStep?.key === 'viewedOrders') {
      // Complete viewedOrders step
      await markStepComplete('viewedOrders', true);
    }
  };

  const handleOnboardingSkip = async () => {
    if (currentStep?.key === 'visitedStore') {
      // Skip the order guidance
      await markStepComplete('visitedStore', true);
    } else if (currentStep) {
      await markStepComplete(currentStep.key, true);
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingTooltip(false);
  };

  const fetchStoreData = async () => {
    try {
      const response = await fetch(`/api/stores/${id}`)
      if (!response.ok) {
        console.error('Failed to fetch store data:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      setStoreName(data.name)
      setStoreDescription(data.description)
      setIsOwner(session && data.ownerId === session.user.id)

      // Priority 1: Use the logged-in user's selected campaign if they are viewing the store
      // Priority 2: Use campaignId from store owner if available
      // Priority 3: Fallback to schoolId
      
      let campaignIdToUse = null;
      
      // If user is logged in, try to use their selected campaign
      if (session?.user) {
        try {
          // Try to get user's campaign context
          const userCampaignResponse = await fetch('/api/users/campaigns');
          if (userCampaignResponse.ok) {
            const userCampaignData = await userCampaignResponse.json();
            const { getUserCampaignContext } = await import('../../utils/campaignHelpers');
            const context = getUserCampaignContext(userCampaignData);
            
            if (context.activeCampaignId) {
              campaignIdToUse = context.activeCampaignId;
              console.log('[boutique] Using logged-in user\'s selected campaign:', campaignIdToUse);
            }
          }
        } catch (error) {
          console.error('Error fetching user campaign context:', error);
        }
      }
      
      // If no user campaign selected, use store owner's campaign
      if (!campaignIdToUse && data.campaignId) {
        campaignIdToUse = data.campaignId;
        console.log('[boutique] Using store owner\'s campaign:', campaignIdToUse);
      }
      
      if (campaignIdToUse) {
        setCampaignId(campaignIdToUse)
        
        // Fetch campaign data for test mode check
        try {
          const campaignResponse = await fetch(`/api/campaigns/${campaignIdToUse}`)
          if (campaignResponse.ok) {
            const campaignResponseData = await campaignResponse.json()
            if (campaignResponseData.campaign) {
              setCampaignData(campaignResponseData.campaign)
            }
          }
        } catch (campaignError) {
          console.error('Error fetching campaign data:', campaignError)
        }
      }
      
      // Also set schoolId for backward compatibility and school name display
      if (data.ownerSchool) {
        setSchoolId(data.ownerSchool)
        // Fetch school data for school name
        try {
          const schoolResponse = await fetch(`/api/schools/${data.ownerSchool}`)
          if (schoolResponse.ok) {
            const schoolData = await schoolResponse.json()
            setSchoolName(schoolData.name)
          }
        } catch (schoolError) {
          console.error('Error fetching school data:', schoolError)
        }
      } else if (!campaignIdToUse) {
        // Only fallback to schoolId-based approach if no campaignId available
        console.log('No campaignId available, falling back to schoolId-based approach')
      }

      // Fetch owner data for additional info (name, email, phone)
      try {
        const ownerResponse = await fetch(`/api/users/${data.ownerId}`)
        if (ownerResponse.ok) {
          const ownerData = await ownerResponse.json()
          setOwnerName(ownerData.name)
          setOwnerEmail(ownerData.email)
          setOwnerPhone(ownerData.parentInfo?.telephone || '')

          // Try to get campaign dates from owner's active campaign
          let activeCampaignId = null;
          
          // Get active campaign ID
          if (ownerData.activeCampaignId) {
            activeCampaignId = ownerData.activeCampaignId;
          } else if (ownerData.campaigns && ownerData.campaigns.length > 0) {
            const activeCampaign = ownerData.campaigns.find(campaign => campaign.isActive);
            if (activeCampaign) {
              activeCampaignId = activeCampaign.campaignId;
            }
          }
          
          // Fetch campaign data for dates
          if (activeCampaignId) {
            try {
              const campaignResponse = await fetch(`/api/campaigns/${activeCampaignId}`)
              if (campaignResponse.ok) {
                const campaignResponseData = await campaignResponse.json()
                if (campaignResponseData.campaign) {
                  setCampaignData(campaignResponseData.campaign)
                  setOrderDeadline(campaignResponseData.campaign.endDate)
                  setDeliveryDate(campaignResponseData.campaign.deliveryDate)
                }
              }
            } catch (campaignError) {
              console.error('Error fetching campaign:', campaignError)
            }
          }
        }
      } catch (ownerError) {
        console.error('Error fetching owner data:', ownerError)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error)
    }
  }

  // Listen for cart changes and onboarding events to guide order process
  useEffect(() => {
    const handleStorageChange = () => {
      const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalItems > 0 && currentStep?.key === 'visitedStore' && !isCompleted) {
        // Highlight the checkout button
        const checkoutButton = document.querySelector('.cart-checkout-button, [data-testid="checkout-button"]');
        if (checkoutButton) {
          checkoutButton.classList.add('ring-4', 'ring-green-500', 'ring-opacity-75');
          setTooltipTarget(checkoutButton);
          setShowOnboardingTooltip(true);
        }
      }
    };

    const handleItemAdded = () => handleStorageChange();
    const handleCheckoutOpened = () => {
      // Show test data modal when checkout opens
      if (currentStep?.key === 'visitedStore' && !isCompleted) {
        setShowTestDataModal(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('itemAddedToCart', handleItemAdded);
    window.addEventListener('checkoutOpened', handleCheckoutOpened);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('itemAddedToCart', handleItemAdded);
      window.removeEventListener('checkoutOpened', handleCheckoutOpened);
    };
  }, [currentStep, isCompleted]);

  // Listen for successful order completion
  useEffect(() => {
    const handleOrderSuccess = () => {
      // If we're in visitedStore step and order was successful
      if (currentStep?.key === 'visitedStore' && !isCompleted) {
        setTimeout(async () => {
          await markStepComplete('visitedStore', true);
          toast.success('Félicitations ! Vous avez créé votre première commande. Vous pouvez maintenant voir vos commandes dans le tableau de bord.');
        }, 2000);
      }
    };

    // Listen for custom order success event
    window.addEventListener('orderSuccess', handleOrderSuccess);
    return () => window.removeEventListener('orderSuccess', handleOrderSuccess);
  }, [currentStep, isCompleted, markStepComplete]);

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

  const isTest = campaignData ? isTestCampaign(campaignData) : false;

  const content =       <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-safe pb-20 lg:pb-safe">
  {isTest && (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm mb-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-orange-900 mb-1">
            ⚠️ MODE TEST
          </h3>
          <p className="text-sm text-orange-800">
            Cette boutique est en mode test. Les commandes ne seront pas traitées jusqu'à l'approbation de la campagne.
          </p>
        </div>
      </div>
    </div>
  )}
  {isOwner && (
    <div className="sticky top-0 z-10 bg-white pt-2 pb-4">
      <div className="flex items-center justify-between">
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
      <div className="overflow-y-auto">
        <ProductList schoolId={schoolId} campaignId={campaignId} />
      </div>
    </div>
    <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8 order-1 lg:order-2">
      {/* Desktop Cart - hidden on mobile */}
      <div className="hidden lg:block">
        <Cart id={id} campaignId={campaignId} schoolId={schoolId} />
      </div>
      
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
    
    {/* Mobile Sticky Cart */}
    <StickyCartMobile 
      id={id}
      campaignId={campaignId}
      schoolId={schoolId}
      onCheckoutOpen={() => {
        if (currentStep?.key === 'visitedStore' && !isCompleted) {
          setShowTestDataModal(true)
        }
      }}
    />
  </div>
</div>

  

return isOwner ? (
  <Layout>
    {content}
    
    {/* Onboarding Tooltip */}
    {showOnboardingTooltip && currentStep && tooltipTarget && (
      <OnboardingTooltip
        isVisible={showOnboardingTooltip}
        position="right"
        title={getStepContent(currentStep.key).title}
        message={getStepContent(currentStep.key).message}
        tip={getStepContent(currentStep.key).tip}
        stats={getStepContent(currentStep.key).stats}
        benefit={getStepContent(currentStep.key).benefit}
        onNext={handleOnboardingNext}
        onSkip={handleOnboardingSkip}
        onClose={handleOnboardingClose}
        currentStep={currentStep.order}
        totalSteps={6}
        showCelebration={false}
        targetElement={tooltipTarget}
      />
    )}
    
    {/* Test Data Modal */}
    {showTestDataModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">📋 Données de test pour votre commande</h3>
          <p className="text-gray-600 mb-4">
            Voici des données fictives que vous pouvez copier-coller pour tester votre boutique :
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet :</label>
              <div className="bg-gray-100 p-2 rounded border font-mono text-sm">
                Marie Dubois
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (utilisez le vôtre pour voir l'exemple) :</label>
              <div className="bg-gray-100 p-2 rounded border font-mono text-sm">
                {session?.user?.email || 'votre.email@exemple.com'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone :</label>
              <div className="bg-gray-100 p-2 rounded border font-mono text-sm">
                514-123-4567
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>💡 Conseil :</strong> Utilisez votre vrai email pour voir l'exemple d'email que vos clients recevront !
            </p>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowTestDataModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                setShowTestDataModal(false);
                // Continue with normal checkout flow
                const checkoutButton = document.querySelector('.cart-checkout-button, [data-testid="checkout-button"]');
                if (checkoutButton) {
                  checkoutButton.click();
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Continuer la commande
            </button>
          </div>
        </div>
      </div>
    )}
  </Layout>
) : (
  <>
    {content}
    
    {/* Onboarding Tooltip */}
    {showOnboardingTooltip && currentStep && tooltipTarget && (
      <OnboardingTooltip
        isVisible={showOnboardingTooltip}
        position="right"
        title={getStepContent(currentStep.key).title}
        message={getStepContent(currentStep.key).message}
        tip={getStepContent(currentStep.key).tip}
        stats={getStepContent(currentStep.key).stats}
        benefit={getStepContent(currentStep.key).benefit}
        onNext={handleOnboardingNext}
        onSkip={handleOnboardingSkip}
        onClose={handleOnboardingClose}
        currentStep={currentStep.order}
        totalSteps={6}
        showCelebration={false}
        targetElement={tooltipTarget}
      />
    )}
    
    {/* Test Data Modal */}
    {showTestDataModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">📋 Données de test pour votre commande</h3>
          <p className="text-gray-600 mb-4">
            Voici des données fictives que vous pouvez copier-coller pour tester votre boutique :
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet :</label>
              <div className="bg-gray-100 p-2 rounded border font-mono text-sm">
                Marie Dubois
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (utilisez le vôtre pour voir l'exemple) :</label>
              <div className="bg-gray-100 p-2 rounded border font-mono text-sm">
                {session?.user?.email || 'votre.email@exemple.com'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone :</label>
              <div className="bg-gray-100 p-2 rounded border font-mono text-sm">
                514-123-4567
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>💡 Conseil :</strong> Utilisez votre vrai email pour voir l'exemple d'email que vos clients recevront !
            </p>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowTestDataModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                setShowTestDataModal(false);
                // Continue with normal checkout flow
                const checkoutButton = document.querySelector('.cart-checkout-button, [data-testid="checkout-button"]');
                if (checkoutButton) {
                  checkoutButton.click();
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Continuer la commande
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)
}