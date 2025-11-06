import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Layout from '../../components/Layout'
import ProductList from '../../components/ProductList'
import Cart from '../../components/Cart'
import StickyCartMobile from '../../components/StickyCartMobile'
import { ArrowLeft, ShoppingBag, Percent, AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import Link from 'next/link'
import ShareSection from '../../components/ShareSection'
import StoreInfoCard from '../../components/StoreInfoCard'
import { motion } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import useOnboarding from '../../hooks/useOnboarding'
import OnboardingTooltip from '../../components/Dashboard/OnboardingTooltip'
import { toast } from 'sonner'
import { isTestCampaign } from '../../utils/campaignHelpers'
import { trackVisit } from '../../lib/analytics'
import dbConnect from '../../lib/mongodb'
import Store from '../../models/Store'
import User from '../../models/User'
import Campaign from '../../models/Campaign'
import School from '../../models/School'
import Product from '../../models/Product'
import mongoose from 'mongoose'
import sanitizeHtml from 'sanitize-html'

export default function Boutique({
  initialStoreData,
  initialProducts
}) {
  const router = useRouter()
  const { id, slug } = router.query
  // Use slug if available (from root route), otherwise use id (from /boutique/[id] route)
  const storeIdentifier = slug || id
  const { data: session } = useSession()

  // Initialize from server-side props for instant load
  const [storeName, setStoreName] = useState(initialStoreData?.name || '')
  const [storeDescription, setStoreDescription] = useState(initialStoreData?.description || '')
  const [isOwner, setIsOwner] = useState(initialStoreData?.isOwner || false)
  const [ownerName, setOwnerName] = useState(initialStoreData?.ownerName || '')
  const [ownerEmail, setOwnerEmail] = useState(initialStoreData?.ownerEmail || '')
  const [ownerPhone, setOwnerPhone] = useState(initialStoreData?.ownerPhone || '')
  const [schoolName, setSchoolName] = useState(initialStoreData?.schoolName || '')
  const [schoolId, setSchoolId] = useState(initialStoreData?.ownerSchool || null)
  const [campaignId, setCampaignId] = useState(initialStoreData?.campaignId || null)
  const [campaignData, setCampaignData] = useState(initialStoreData?.campaign || null)
  const [orderDeadline, setOrderDeadline] = useState(initialStoreData?.campaign?.endDate || '')
  const [deliveryDate, setDeliveryDate] = useState(initialStoreData?.campaign?.deliveryDate || '')
  const [cartItemCount, setCartItemCount] = useState(0)
  const [discountProgress, setDiscountProgress] = useState(0)
  const [currentDiscount, setCurrentDiscount] = useState(0)
  const [isStoreDataLoaded, setIsStoreDataLoaded] = useState(!!initialStoreData)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const descriptionRef = useRef(null)
  const [showExpandButton, setShowExpandButton] = useState(false)
  const [discountEnabled, setDiscountEnabled] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isExpired, setIsExpired] = useState(false)

  // Timer countdown for order deadline
  useEffect(() => {
    if (!orderDeadline) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const deadline = new Date(orderDeadline).getTime()
      const difference = deadline - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setIsExpired(false)
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeRemaining({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [orderDeadline])

  // Check if description needs expansion
  useEffect(() => {
    if (!storeDescription) {
      setShowExpandButton(false)
      return
    }

    // Simple check: if description is longer than ~100 characters, it likely exceeds 2 lines
    // This is a quick heuristic that works in most cases
    if (storeDescription.length > 100) {
      setShowExpandButton(true)
      return
    }

    const checkDescriptionHeight = () => {
      if (descriptionRef.current && storeDescription) {
        // Wait for next frame to ensure styles are applied
        requestAnimationFrame(() => {
          // Create a temporary element to measure height without line-clamp
          const tempDiv = document.createElement('div')
          const styles = window.getComputedStyle(descriptionRef.current)
          const width = descriptionRef.current.offsetWidth || 300

          tempDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            width: ${width}px;
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            font-family: ${styles.fontFamily};
            padding: 0;
            margin: 0;
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
          `
          tempDiv.textContent = storeDescription
          document.body.appendChild(tempDiv)

          const fullHeight = tempDiv.offsetHeight
          const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.5
          const maxHeight = lineHeight * 2

          document.body.removeChild(tempDiv)

          // Show expand button if content exceeds 2 lines
          setShowExpandButton(fullHeight > maxHeight)
        })
      }
    }

    // Check immediately and after a short delay to ensure DOM is ready
    checkDescriptionHeight()
    const timer = setTimeout(checkDescriptionHeight, 200)

    // Also check on window resize
    window.addEventListener('resize', checkDescriptionHeight)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkDescriptionHeight)
    }
  }, [storeDescription])

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

  // Update isOwner when session changes (client-side update)
  useEffect(() => {
    if (session && initialStoreData?.ownerId) {
      setIsOwner(session.user.id === initialStoreData.ownerId)
    }
  }, [session, initialStoreData?.ownerId])

  // Fetch store discount setting
  useEffect(() => {
    if (storeIdentifier) {
      fetch(`/api/stores/${storeIdentifier}`)
        .then(res => res.json())
        .then(data => {
          setDiscountEnabled(data.discountEnabled !== false)
        })
        .catch(err => console.error('Error fetching store discount setting:', err))
    }
  }, [storeIdentifier])

  // Update cart item count from localStorage
  const updateCartItemCount = () => {
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    setCartItemCount(totalItems)

    // Calculate discount progress
    if (discountEnabled) {
      if (totalItems >= 6) {
        setCurrentDiscount(5)
        setDiscountProgress(100)
      } else {
        setCurrentDiscount(0)
        setDiscountProgress((totalItems / 6) * 100)
      }
    } else {
      setCurrentDiscount(0)
      setDiscountProgress(0)
    }
  }

  useEffect(() => {
    updateCartItemCount()
    window.addEventListener('storage', updateCartItemCount)
    window.addEventListener('itemAddedToCart', updateCartItemCount)
    return () => {
      window.removeEventListener('storage', updateCartItemCount)
      window.removeEventListener('itemAddedToCart', updateCartItemCount)
    }
  }, [discountEnabled])

  // Track visit when store data is loaded
  // Track visit even if campaignId/schoolId are not yet available (they can be null)
  useEffect(() => {
    if (storeIdentifier) {
      // Delay tracking slightly to allow store data to load
      const timer = setTimeout(() => {
        trackVisit({
          storeId: storeIdentifier,
          campaignId: campaignId || null,
          schoolId: schoolId || null,
          userId: session?.user?.id || null
        }).catch(err => {
          console.error('Failed to track visit:', err)
        })
      }, 500) // Small delay to ensure store data is loaded

      return () => clearTimeout(timer)
    }
  }, [storeIdentifier, campaignId, schoolId, session])

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

  const content = <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-safe pb-20 lg:pb-safe">
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
      transition={{ duration: 0.3 }}
      className="mb-4 sm:mb-6 lg:mb-8"
    >
      {storeName ? (
        <>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">{storeName}</h1>
          {storeDescription && (
            <div className="relative">
              <div
                ref={descriptionRef}
                className={`text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed transition-all duration-300 ${!isDescriptionExpanded ? 'line-clamp-2' : ''
                  }`}
                style={!isDescriptionExpanded ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } : {}}
              >
                {storeDescription}
              </div>
              {showExpandButton && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-2 flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-all hover:gap-2 active:scale-95"
                  type="button"
                  aria-label={isDescriptionExpanded ? "Réduire la description" : "Voir la description complète"}
                >
                  <span>{isDescriptionExpanded ? "Voir moins" : "Voir plus"}</span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-full"></div>
        </div>
      )}
    </motion.div>

    {/* Urgency Banner - Date limite */}
    {orderDeadline && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-3 sm:p-4 shadow-lg"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm sm:text-base font-semibold">⏰ Date limite : {new Date(orderDeadline).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {deliveryDate && (
              <p className="text-sm sm:text-base opacity-90 mt-0.5">📦 Livraison le {new Date(deliveryDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}</p>
            )}
            {isExpired ? (
              <p className="text-xs sm:text-sm opacity-90 mt-1 font-semibold">⚠️ La période de commande est terminée</p>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5">
                <span className="text-xs sm:text-sm opacity-90">Temps restant :</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {timeRemaining.days > 0 && (
                    <div className="bg-white/20 rounded px-2 py-1">
                      <span className="text-xs sm:text-sm font-bold">{timeRemaining.days}</span>
                      <span className="text-xs ml-0.5">j</span>
                    </div>
                  )}
                  <div className="bg-white/20 rounded px-2 py-1">
                    <span className="text-xs sm:text-sm font-bold">{String(timeRemaining.hours).padStart(2, '0')}</span>
                    <span className="text-xs ml-0.5">h</span>
                  </div>
                  <div className="bg-white/20 rounded px-2 py-1">
                    <span className="text-xs sm:text-sm font-bold">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                    <span className="text-xs ml-0.5">m</span>
                  </div>
                  <div className="bg-white/20 rounded px-2 py-1">
                    <span className="text-xs sm:text-sm font-bold">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                    <span className="text-xs ml-0.5">s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )}

    {/* Discount Progress Banner */}
    {discountEnabled && cartItemCount > 0 && cartItemCount < 6 && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 sm:p-5 shadow-lg"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 rounded-full p-2">
            <Percent className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base sm:text-lg font-bold">
              {6 - cartItemCount} produit{6 - cartItemCount > 1 ? 's' : ''} de plus pour obtenir 5% de réduction!
            </p>
            <p className="text-xs sm:text-sm opacity-90 mt-1">Économisez sur votre commande totale</p>
          </div>
        </div>
        <Progress value={discountProgress} className="h-3 bg-white/30" />
      </motion.div>
    )}

    {/* Success Banner - Discount Active */}
    {discountEnabled && cartItemCount >= 6 && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 sm:p-5 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <Percent className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base sm:text-lg font-bold">🎉 Félicitations! Vous bénéficiez de 5% de réduction!</p>
            <p className="text-xs sm:text-sm opacity-90 mt-1">Votre réduction sera appliquée automatiquement</p>
          </div>
        </div>
      </motion.div>
    )}


    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="overflow-y-auto">
          <ProductList
            schoolId={schoolId}
            campaignId={campaignId}
            storeId={storeIdentifier}
            isReady={isStoreDataLoaded || !!initialProducts}
            initialProducts={initialProducts}
          />
        </div>

        {/* Mobile: StoreInfoCard and ShareSection below products */}
        <div className="lg:hidden mt-6 mb-24 sm:mb-28 space-y-4">
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

      {/* Desktop sidebar */}
      <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8 order-1 lg:order-2">
        {/* Desktop Cart - hidden on mobile */}
        <div className="hidden lg:block">
          <Cart id={storeIdentifier} campaignId={campaignId} schoolId={schoolId} campaignData={initialStoreData?.campaign} initialDeliveryOptions={initialStoreData?.deliveryOptions} />
        </div>

        {/* Desktop: StoreInfoCard and ShareSection */}
        <div className="hidden lg:block space-y-4 sm:space-y-6 lg:space-y-8">
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

      {/* Mobile Sticky Cart */}
      <StickyCartMobile
        id={storeIdentifier}
        campaignId={campaignId}
        schoolId={schoolId}
        campaignData={initialStoreData?.campaign}
        initialDeliveryOptions={initialStoreData?.deliveryOptions}
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

export async function getServerSideProps(context) {
  const { id, slug } = context.params
  const storeIdentifier = slug || id

  try {
    await dbConnect()

    // Find store
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(storeIdentifier)
    let store

    if (isObjectId) {
      store = await Store.findById(storeIdentifier)
    } else {
      store = await Store.findOne({ slug: storeIdentifier })
      if (!store && mongoose.Types.ObjectId.isValid(storeIdentifier)) {
        store = await Store.findById(storeIdentifier)
      }
    }

    if (!store) {
      return { notFound: true }
    }

    const rawStore = store.toObject ? store.toObject() : store
    const campaignIdFromRaw = rawStore.campaignId || store.campaignId

    // Get owner
    const owner = await User.findById(store.user)
    if (!owner) {
      return { notFound: true }
    }

    // Get campaignId
    let campaignIdToUse = null
    if (campaignIdFromRaw) {
      if (mongoose.Types.ObjectId.isValid(campaignIdFromRaw)) {
        campaignIdToUse = campaignIdFromRaw.toString()
      } else {
        campaignIdToUse = campaignIdFromRaw
      }
    }

    // Get campaign data and school info
    let campaignData = null
    let schoolName = null
    let schoolIdToUse = null

    if (campaignIdToUse) {
      const campaign = await Campaign.findById(campaignIdToUse).populate('school').lean()
      if (campaign) {
        campaignData = {
          endDate: campaign.endDate ? new Date(campaign.endDate).toISOString() : null,
          deliveryDate: campaign.deliveryDate ? new Date(campaign.deliveryDate).toISOString() : null,
          status: campaign.status,
          isActive: campaign.isActive,
          donationsForStudents: campaign.donationsForStudents || {
            enabled: true,
            presets: [0, 2, 5]
          },
          donationsForSchool: campaign.donationsForSchool || {
            enabled: true,
            presets: [0, 2, 5]
          },
          organizationType: campaign.organizationType || 'school'
        }

        if (campaign.school) {
          schoolIdToUse = campaign.school._id.toString()
          schoolName = campaign.school.name
        }
      }
    }

    // Fallback to owner.school
    if (!schoolIdToUse && owner.school) {
      schoolIdToUse = owner.school.toString()
      if (!schoolName) {
        const school = await School.findById(owner.school).lean()
        if (school) {
          schoolName = school.name
        }
      }
    }

    // Get owner phone
    const ownerPhone = owner.role === 'school_manager'
      ? (owner.schoolManagerInfo?.telephone || owner.schoolManagerInfo?.cellulaire || '')
      : (owner.parentInfo?.telephone || '')

    // Fetch products with custom pricing
    let products = []
    if (campaignIdToUse) {
      const activeCampaign = await Campaign.findById(campaignIdToUse)
        .populate('customPrices.productId', '_id')
        .lean()

      const productDocs = await Product.find({})
        .sort({ order: 1, createdAt: -1 })
        .limit(100)
        .lean()

      products = productDocs
        .filter(product => product && product._id && product.name)
        .map(product => {
          let finalPrice = product.price
          let hasCustomPrice = false

          if (activeCampaign?.customPrices?.length > 0) {
            const productIdStr = product._id.toString()
            const customPrice = activeCampaign.customPrices.find(cp => {
              if (!cp.productId) return false
              let cpProductId = null
              if (cp.productId._id) {
                cpProductId = cp.productId._id.toString()
              } else if (cp.productId.toString && typeof cp.productId.toString === 'function') {
                cpProductId = cp.productId.toString()
              } else if (typeof cp.productId === 'string') {
                cpProductId = cp.productId
              } else {
                try {
                  cpProductId = String(cp.productId)
                } catch (e) {
                  return false
                }
              }
              return cpProductId === productIdStr
            })

            if (customPrice && customPrice.price !== undefined && customPrice.price !== null) {
              finalPrice = customPrice.price
              hasCustomPrice = true
            }
          }

          const productData = {
            id: product._id.toString(),
            name: sanitizeHtml(String(product.name || '')),
            description: sanitizeHtml(String(product.description || '')),
            price: Number(finalPrice) || 0,
            originalPrice: Number(product.price) || 0,
            cost: Number(product.cost) || 0,
            image: sanitizeHtml(String(product.image || '')),
            ingredientsImage: sanitizeHtml(String(product.ingredientsImage || '')),
            nutritionImage: sanitizeHtml(String(product.nutritionImage || '')),
            isDefault: Boolean(product.isDefault),
            productId: String(product.productId || ''),
            order: Number(product.order) || 0,
            hasCustomPrice: hasCustomPrice
          }

          // Debug: Log products with ingredient/nutrition images
          if (productData.ingredientsImage || productData.nutritionImage) {
            console.log(`[Boutique SSR] Product "${productData.name}" has images:`, {
              ingredientsImage: productData.ingredientsImage,
              nutritionImage: productData.nutritionImage
            })
          }

          return productData
        })
    } else {
      // Fetch products without custom pricing
      const productDocs = await Product.find({})
        .sort({ order: 1, createdAt: -1 })
        .limit(100)
        .lean()

      products = productDocs
        .filter(product => product && product._id && product.name)
        .map(product => ({
          id: product._id.toString(),
          name: sanitizeHtml(String(product.name || '')),
          description: sanitizeHtml(String(product.description || '')),
          price: Number(product.price) || 0,
          originalPrice: Number(product.price) || 0,
          cost: Number(product.cost) || 0,
          image: sanitizeHtml(String(product.image || '')),
          ingredientsImage: sanitizeHtml(String(product.ingredientsImage || '')),
          nutritionImage: sanitizeHtml(String(product.nutritionImage || '')),
          isDefault: Boolean(product.isDefault),
          productId: String(product.productId || ''),
          order: Number(product.order) || 0,
          hasCustomPrice: false
        }))
    }

    // Normalize deliveryOptions (similar to /api/stores/[id])
    const normalizeDeliveryOptions = (options) => {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return [
          { name: 'Travail', enabled: true },
          { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
          { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
          { name: 'Autre', enabled: true }
        ];
      }

      // If old format (strings), migrate
      if (typeof options[0] === 'string') {
        const migrationMap = {
          'Travail': { name: 'Travail', enabled: true },
          'Livraison (si près de chez moi)': { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
          'Pickup (chez moi)': { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
          'Autre': { name: 'Autre', enabled: true }
        };
        return options.map(opt => {
          if (typeof opt === 'string') {
            return migrationMap[opt] || { name: opt, enabled: true };
          }
          return opt;
        });
      }

      // Already in new format - filter invalid options
      const validOptions = options.filter(opt => opt && opt.name);
      if (validOptions.length === 0) {
        return [
          { name: 'Travail', enabled: true },
          { name: 'Livraison (si près de chez moi)', enabled: true, deliveryRadius: '' },
          { name: 'Pickup (chez moi)', enabled: true, pickupAddress: '' },
          { name: 'Autre', enabled: true }
        ];
      }

      // Ensure all options have required fields
      return validOptions.map(opt => ({
        name: opt.name || 'Autre',
        enabled: opt.enabled !== undefined ? opt.enabled : true,
        pickupAddress: opt.pickupAddress || '',
        deliveryRadius: opt.deliveryRadius || ''
      }));
    };

    const normalizedDeliveryOptions = normalizeDeliveryOptions(store.deliveryOptions);

    return {
      props: {
        initialStoreData: {
          name: store.name,
          description: store.description,
          ownerId: store.user.toString(),
          ownerName: owner.name,
          ownerEmail: owner.email,
          ownerPhone: ownerPhone,
          ownerSchool: schoolIdToUse,
          campaignId: campaignIdToUse,
          slug: store.slug || null,
          campaign: campaignData,
          schoolName: schoolName,
          deliveryOptions: normalizedDeliveryOptions
        },
        initialProducts: products
      }
    }
  } catch (error) {
    console.error('Error in getServerSideProps:', error)
    return { notFound: true }
  }
}