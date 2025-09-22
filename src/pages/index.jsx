// pages/index.jsx

import Layout from '../components/Layout'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Cake, ShoppingBag, TrendingUp, Percent } from 'lucide-react'
import useIsMobile from '../utils/useIsMobile'
import { motion } from 'framer-motion'
import Progress from '@/components/ui/progress' // Ensure this component exists

export default function Home() {
  const isMobile = useIsMobile(); // Correctly invoke the hook

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24">
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
          Financez vos projets avec <span className="text-primary">Massibec</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-muted-foreground mb-8">
          Créez votre boutique en ligne, vendez des produits Massibec, et atteignez vos objectifs de financement !
        </p>

        {/* Action Buttons */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row space-x-4'} justify-center mb-12`}
        >
          <Link href="/inscription" passHref>
            <Button
              size="lg"
              className="w-full sm:w-auto py-4 px-6 text-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg transition transform duration-300 ease-in-out flex items-center justify-center"
            >
              Je suis un élève
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/inscription-manager" passHref>
            <Button
              size="lg"
              className="w-full sm:w-auto py-4 px-6 text-xl font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-lg transition transform duration-300 ease-in-out flex items-center justify-center"
            >
              Je suis une école
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {isMobile && (
            <Link href="/boutique/6727e71469f266eb88bbfd79" passHref>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto py-4 px-6 text-xl font-semibold border-blue-600 text-blue-600 hover:bg-blue-50 shadow-lg rounded-lg transition transform duration-300 ease-in-out"
              >
                Voir un exemple
              </Button>
            </Link>
          )}
        </motion.div>

        {/* "How It Works" Section */}
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">Comment ça marche ?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white shadow-md rounded-lg overflow-hidden"
          >
            <CardHeader className="flex items-center justify-center bg-blue-500">
              <CardTitle className="flex items-center text-white">
                <ShoppingBag className="h-6 w-6 mr-2" />
                Créez
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-700">
                Inscrivez-vous et personnalisez votre boutique en ligne unique.
              </p>
            </CardContent>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white shadow-md rounded-lg overflow-hidden"
          >
            <CardHeader className="flex items-center justify-center bg-green-500">
              <CardTitle className="flex items-center text-white">
                <Cake className="h-6 w-6 mr-2" />
                Vendez
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-700">
                Partagez votre lien et vendez des délicieux produits Massibec.
              </p>
            </CardContent>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white shadow-md rounded-lg overflow-hidden"
          >
            <CardHeader className="flex items-center justify-center bg-yellow-500">
              <CardTitle className="flex items-center text-white">
                <TrendingUp className="h-6 w-6 mr-2" />
                Réussissez
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-700">
                Atteignez vos objectifs de financement et réalisez vos projets.
              </p>
            </CardContent>
          </motion.div>
        </div>


      </div>
    </Layout>
  )
}