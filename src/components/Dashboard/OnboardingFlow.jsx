import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight, CheckCircle, Trophy, Gift, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OnboardingFlow = ({ currentStep, onComplete, onSkip, onNext }) => {
  const [show, setShow] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const steps = [
    {
      id: 'campaign',
      title: '🎉 Bienvenue dans Jappuie.ca !',
      message: 'Commencez par rejoindre une campagne de financement. C\'est le premier pas pour créer votre propre boutique et commencer à vendre !',
      buttonText: 'Rejoindre une campagne',
      emoji: '🚀',
      icon: Rocket,
      color: 'from-blue-500 to-purple-500',
      successMessage: '🎊 Excellent ! Vous avez rejoint une campagne !'
    },
    {
      id: 'personalize',
      title: '✨ Personnalisez votre boutique',
      message: 'Créez votre boutique personnalisée avec votre nom et une description accrocheuse. C\'est votre vitrine pour vendre vos produits !',
      buttonText: 'Personnaliser ma boutique',
      emoji: '🎨',
      icon: Gift,
      color: 'from-purple-500 to-pink-500',
      successMessage: '🎉 Parfait ! Votre boutique est maintenant personnalisée !'
    },
    {
      id: 'tools',
      title: '🎯 Votre kit de vente',
      message: 'Générez des affiches magnifiques et des QR codes pour promouvoir vos produits. Partagez-les partout pour maximiser vos ventes !',
      buttonText: 'Voir les outils de vente',
      emoji: '📱',
      icon: Trophy,
      color: 'from-pink-500 to-orange-500',
      successMessage: '🔥 Génial ! Vous êtes prêt à vendre !'
    },
    {
      id: 'statistics',
      title: '📊 Suivez vos progrès',
      message: 'Consultez vos statistiques en temps réel : nombre de ventes, objectifs atteints, et bien plus encore !',
      buttonText: 'Voir les statistiques',
      emoji: '📈',
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      successMessage: '🌟 Excellent ! Vous pouvez maintenant suivre vos progrès !'
    }
  ];

  const currentStepData = steps.find(s => s.id === currentStep);
  const IconComponent = currentStepData?.icon || Sparkles;

  if (!currentStepData || !show) return null;

  const handleComplete = () => {
    setShowCelebration(true);
    setTimeout(() => {
      setShow(false);
      setShowCelebration(false);
      onComplete?.(currentStep);
    }, 2000);
  };

  const handleSkip = () => {
    setShow(false);
    onSkip?.(currentStep);
  };

  const handleNext = () => {
    setShowCelebration(true);
    setTimeout(() => {
      setShow(false);
      setShowCelebration(false);
      onNext?.(currentStep);
    }, 2000);
  };

  return (
    <>
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          >
            <div className="text-6xl">
              {['🎉', '🎊', '✨', '🌟', '🔥'].map((emoji, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{
                    scale: [0, 1.5, 1],
                    opacity: [0, 1, 0],
                    y: [-50, -100, -150],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: index * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute"
                  style={{
                    left: `${20 + index * 15}%`,
                    top: '50%'
                  }}
                >
                  {emoji}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Onboarding Modal */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleSkip}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className={`border-4 border-gradient-to-r bg-gradient-to-br ${currentStepData.color} shadow-2xl overflow-hidden`}>
                {/* Header with gradient */}
                <div className={`bg-gradient-to-r ${currentStepData.color} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-4xl"
                      >
                        {currentStepData.emoji}
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-bold">
                          {currentStepData.title}
                        </h3>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6 bg-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <IconComponent className={`h-8 w-8 text-gradient-to-r ${currentStepData.color}`} />
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {currentStepData.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Passer
                    </Button>
                    <Button
                      onClick={handleNext}
                      className={`bg-gradient-to-r ${currentStepData.color} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
                    >
                      C'est compris !
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Progress indicator */}
                  <div className="flex items-center justify-center space-x-2">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`h-2 rounded-full transition-all duration-300 ${index < steps.findIndex(s => s.id === currentStep)
                            ? 'bg-green-500 w-8'
                            : index === steps.findIndex(s => s.id === currentStep)
                              ? `bg-gradient-to-r ${currentStepData.color} w-8`
                              : 'bg-gray-300 w-2'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Encouragement text */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 italic">
                      💡 {currentStep === 'campaign' ? 'C\'est votre première étape vers le succès !' :
                        currentStep === 'personalize' ? 'Créez quelque chose d\'unique qui vous ressemble !' :
                          currentStep === 'tools' ? 'Vos outils de vente vous attendent !' :
                            'Vous êtes presque arrivé au bout !'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow pointing to the highlighted element */}
              <motion.div
                animate={{
                  y: [0, 10, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-12 right-0 text-white drop-shadow-lg"
              >
                <div className="relative">
                  <ArrowRight className="h-12 w-12 rotate-90" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 bg-white rounded-full blur-md opacity-50"
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OnboardingFlow;