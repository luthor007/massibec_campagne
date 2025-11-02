import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  X, 
  ChevronRight, 
  Lightbulb, 
  Target,
  TrendingUp,
  Users,
  Star,
  ArrowRight
} from 'lucide-react';

const OnboardingTooltip = ({
  isVisible,
  position = 'top',
  title,
  message,
  tip,
  stats,
  benefit,
  onNext,
  onSkip,
  onClose,
  currentStep,
  totalSteps,
  showCelebration = false,
  targetElement
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showCelebration) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showCelebration]);

  // Calculate tooltip position relative to target element
  useEffect(() => {
    if (targetElement && isVisible) {
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let top, left;
      let actualPosition = position;
      
      const offset = 30; // Increased offset for better clearance
      const tooltipWidth = 320; // Approximate tooltip width (max-w-xs)
      const tooltipHeight = 150; // Reduced height estimate for compact tooltips
      
      // Check if tooltip would go off-screen and adjust position accordingly
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Determine best position based on available space
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;
      
      // Calculate if tooltip would overlap with other elements
      const tooltipTop = rect.top - tooltipHeight - offset;
      const tooltipBottom = rect.bottom + tooltipHeight + offset;
      const tooltipLeft = rect.left - tooltipWidth - offset;
      const tooltipRight = rect.right + tooltipWidth + offset;
      
      // Special handling for personalization form elements
      const isPersonalizationForm = window.location.pathname.includes('/personnalisation');
      
      // Auto-adjust position if original position doesn't have enough space
      // or would overlap with form elements
      if (position === 'top' && (spaceAbove < tooltipHeight + offset || tooltipTop < 20)) {
        actualPosition = 'bottom';
      } else if (position === 'bottom' && (spaceBelow < tooltipHeight + offset || tooltipBottom > viewportHeight - 20)) {
        actualPosition = 'top';
      } else if (position === 'left' && (spaceLeft < tooltipWidth + offset || tooltipLeft < 20)) {
        actualPosition = 'right';
      } else if (position === 'right' && (spaceRight < tooltipWidth + offset || tooltipRight > viewportWidth - 20)) {
        actualPosition = 'left';
      }
      
      // Special positioning for personalization form to avoid covering form elements
      if (isPersonalizationForm) {
        // Check if this is the auto-deposit element specifically
        const isAutoDepositElement = targetElement?.querySelector?.('input[id="autoDeposit"]') || 
                                   targetElement?.id === 'autoDeposit' ||
                                   targetElement?.textContent?.includes('Dépôts automatiques') ||
                                   targetElement?.className?.includes('border-gray-300');
        
        if (isAutoDepositElement) {
          // For auto-deposit, always use right position to ensure visibility
          actualPosition = 'right';
        } else {
          // For other form elements, be very conservative - only change if absolutely necessary
          if (actualPosition === 'top' && rect.top < 100) {
            actualPosition = 'right';
          } else if (actualPosition === 'left' && rect.left < 150) {
            actualPosition = 'right';
          }
          // Keep original position if there's any reasonable space
        }
      }
      
      switch (actualPosition) {
        case 'top':
          top = rect.top + scrollTop - offset; // More space above the element
          left = rect.left + scrollLeft + (rect.width / 2); // Center horizontally
          break;
        case 'bottom':
          top = rect.bottom + scrollTop + offset; // More space below the element
          left = rect.left + scrollLeft + (rect.width / 2); // Center horizontally
          break;
        case 'left':
          top = rect.top + scrollTop + (rect.height / 2); // Center vertically
          left = rect.left + scrollLeft - offset; // More space to the left
          break;
        case 'right':
          top = rect.top + scrollTop + (rect.height / 2); // Center vertically
          left = rect.right + scrollLeft + offset; // More space to the right
          break;
        default:
          top = rect.top + scrollTop - offset;
          left = rect.left + scrollLeft + (rect.width / 2);
      }
      
      // Ensure tooltip stays within viewport bounds
      // Adjust if tooltip would go off-screen
      if (left < 0) left = 10;
      if (left > viewportWidth - 320) left = viewportWidth - 330;
      if (top < 0) top = 10;
      if (top > viewportHeight - 200) top = viewportHeight - 210;
      
      setTooltipPosition({ top, left, position: actualPosition });
    }
  }, [targetElement, isVisible, position]);

  const getPositionClasses = () => {
    return 'fixed z-50 max-w-xs'; // Compact width
  };

  const getPositionStyle = () => {
    let transform = '';
    const actualPosition = tooltipPosition.position || position;
    
    switch (actualPosition) {
      case 'top':
        transform = 'translateX(-50%) translateY(-100%)'; // Center horizontally, position above
        break;
      case 'bottom':
        transform = 'translateX(-50%)'; // Center horizontally, position below
        break;
      case 'left':
        transform = 'translateX(-100%) translateY(-50%)'; // Position left, center vertically
        break;
      case 'right':
        transform = 'translateY(-50%)'; // Position right, center vertically
        break;
      default:
        transform = 'translateX(-50%) translateY(-100%)';
        break;
    }

    return {
      top: `${tooltipPosition.top}px`,
      left: `${tooltipPosition.left}px`,
      transform: transform,
    };
  };

  const getArrowClasses = () => {
    const actualPosition = tooltipPosition.position || position;
    
    switch (actualPosition) {
      case 'top':
        return 'absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white';
      case 'bottom':
        return 'absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white';
      case 'left':
        return 'absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white';
      case 'right':
        return 'absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white';
      default:
        return 'absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white';
    }
  };

  const getIconForStep = () => {
    if (showCelebration) return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (tip) return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    if (stats) return <TrendingUp className="h-5 w-5 text-blue-500" />;
    if (benefit) return <Target className="h-5 w-5 text-purple-500" />;
    return <Star className="h-5 w-5 text-blue-500" />;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={getPositionClasses()}
        style={getPositionStyle()}
      >
        {/* Confetti Animation */}
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 pointer-events-none"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  rotate: 0,
                  scale: 1 
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 100,
                  y: -Math.random() * 80 - 20,
                  rotate: Math.random() * 360,
                  scale: 0
                }}
                transition={{ 
                  duration: 1.5,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}

        <Card className="shadow-lg border border-blue-200 bg-white">
          <CardContent className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  {getIconForStep()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                  {currentStep && totalSteps && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="text-xs text-gray-500">
                        Étape {currentStep}/{totalSteps}
                      </div>
                      <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
              
              {tip && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">{tip}</p>
                  </div>
                </div>
              )}

              {stats && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">{stats}</p>
                  </div>
                </div>
              )}

              {benefit && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="flex items-start space-x-2">
                    <Target className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-green-800">{benefit}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              {onSkip && (
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  Passer
                </Button>
              )}
              
              <div className="flex space-x-2">
                {onNext && (
                  <Button
                    onClick={onNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {showCelebration ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Parfait !</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span>Compris</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className={getArrowClasses()} />
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTooltip;
