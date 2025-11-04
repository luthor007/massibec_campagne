import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Heart, Rocket, Star } from 'lucide-react'

const motivationalQuotes = [
  {
    text: "Le succès, c'est tomber sept fois et se relever huit.",
    emoji: "💪",
    color: "from-blue-500 to-indigo-600"
  },
  {
    text: "Le seul endroit où le succès vient avant le travail, c'est dans le dictionnaire.",
    emoji: "📚",
    color: "from-indigo-500 to-purple-600"
  },
  {
    text: "Le meilleur moyen de prédire l'avenir, c'est de le créer.",
    emoji: "🚀",
    color: "from-purple-500 to-indigo-600"
  },
  {
    text: "Les défis sont ce qui rend la vie intéressante et les surmonter est ce qui lui donne du sens.",
    emoji: "⭐",
    color: "from-blue-600 to-purple-600"
  },
  {
    text: "Chaque expert était autrefois un débutant. Chaque champion était autrefois un amateur.",
    emoji: "🏆",
    color: "from-indigo-600 to-blue-600"
  },
  {
    text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.",
    emoji: "❤️",
    color: "from-purple-600 to-indigo-600"
  }
]

function MotivationCard() {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length)
        setIsAnimating(false)
      }, 300)
    }, 8000) // Change every 8 seconds

    return () => clearInterval(interval)
  }, [])

  const currentQuote = motivationalQuotes[quoteIndex]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={`bg-gradient-to-br ${currentQuote.color} text-white h-full overflow-hidden relative shadow-lg flex flex-col`}>
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Floating sparkles */}
        <motion.div
          className="absolute top-4 right-4"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="h-6 w-6 text-white/40" />
        </motion.div>

        <CardContent className="flex flex-col items-center justify-center h-full p-6 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 20, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: 90 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-5xl mb-4"
              >
                {currentQuote.emoji}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl font-bold mb-2"
              >
                Motivation du Jour
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-base md:text-lg italic text-white/95 leading-relaxed px-4"
              >
                "{currentQuote.text}"
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex space-x-2 mt-6">
            {motivationalQuotes.map((_, index) => (
              <motion.div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === quoteIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
                animate={{
                  scale: index === quoteIndex ? 1.2 : 1
                }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default MotivationCard

