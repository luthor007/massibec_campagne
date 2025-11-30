// pages/index.jsx

import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Play, Sparkles, TrendingUp, Users, Building2, ShoppingBag, CheckCircle2, Zap, Award, BarChart3, Clock, Shield, Trophy, Package, FileText, Percent, DollarSign } from 'lucide-react'
import useIsMobile from '../utils/useIsMobile'
import dynamic from 'next/dynamic'
import { trackPageVisit, trackHeroCtaClick } from '../lib/funnelAnalytics'

// Import motion normally but optimize animations
import { motion } from 'framer-motion'

// Lazy YouTube iframe component - only loads when visible
const LazyYouTubeIframe = ({ videoId, title, className = "" }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !shouldLoad) {
          setShouldLoad(true);
        }
      },
      { rootMargin: '50px' } // Start loading 50px before it's visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className={`aspect-video relative overflow-hidden rounded-t-lg bg-gray-200 ${className}`}>
      {shouldLoad ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Chargement de la vidéo...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const isMobile = useIsMobile();

  useEffect(() => {
    trackPageVisit('home');
  }, []);

  const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
  const siteName = 'Jappuie';
  const title = 'Jappuie - La révolution du financement scolaire commence ici';
  const description = 'Plateforme de financement scolaire qui connecte les écoles, les fournisseurs et les étudiants. Doublez vos profits avec 20x moins de gestion. Lancez votre campagne en 2 minutes.';
  const imageUrl = `${baseUrl}/images/jappuie_logo.png`;

  return (
    <>
      <Head>
        {/* Google Search Console Verification - Add your verification code here */}
        {/* <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" /> */}

        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="keywords" content="financement scolaire, campagne de financement, école, élèves, fournisseurs, vente de produits, collecte de fonds, Québec, Canada" />
        <meta name="author" content="Jappuie" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="French" />
        <meta name="revisit-after" content="7 days" />
        <link rel="canonical" href={baseUrl} />

        {/* Favicon for search engines */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_jappuie.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon_jappuie.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/images/favicon_jappuie.png" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={baseUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:locale" content="fr_CA" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={baseUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />

        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Jappuie",
              "url": baseUrl,
              "logo": imageUrl,
              "description": description,
              "sameAs": [],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Service",
                "availableLanguage": ["French", "English"]
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": siteName,
              "url": baseUrl,
              "description": description,
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${baseUrl}/boutique/?search={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Jappuie",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "CAD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "50"
              }
            })
          }}
        />
      </Head>
      <Layout>
        <div className="min-h-screen">
          {/* Hero Section with Video Emphasis */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
              <div className="text-center">
                {/* Compelling Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight"
                  style={{ willChange: 'opacity, transform' }}
                >
                  <span className="block">La révolution du financement</span>
                  <span className="block bg-gradient-to-r from-yellow-300 via-green-300 to-blue-300 bg-clip-text text-transparent">
                    commence ici.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
                  className="text-2xl sm:text-3xl md:text-4xl text-blue-50 mb-8 max-w-3xl mx-auto font-bold"
                  style={{ willChange: 'opacity, transform' }}
                >
                  Qui êtes-vous ?
                </motion.p>

                {/* User Type Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                  className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 justify-center items-center max-w-4xl mx-auto px-2"
                  style={{ willChange: 'opacity, transform' }}
                >
                  <Link href="/inscription" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white/95 hover:bg-white text-blue-700 hover:text-blue-800 font-bold px-5 md:px-8 py-4 md:py-6 text-base md:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[44px] touch-manipulation border-2 border-blue-200"
                      onClick={() => trackHeroCtaClick('student')}
                    >
                      <Users className="mr-2 h-5 w-5" />
                      Je suis un Élève
                    </Button>
                  </Link>
                  <Link href="/ecole" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white/95 hover:bg-white text-green-700 hover:text-green-800 font-bold px-5 md:px-8 py-4 md:py-6 text-base md:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[44px] touch-manipulation border-2 border-green-200"
                      onClick={() => trackHeroCtaClick('ecole')}
                    >
                      <Building2 className="mr-2 h-5 w-5" />
                      Je suis une École
                    </Button>
                  </Link>
                  <Link href="/fournisseur" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white/95 hover:bg-white text-purple-700 hover:text-purple-800 font-bold px-5 md:px-8 py-4 md:py-6 text-base md:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[44px] touch-manipulation border-2 border-purple-200"
                      onClick={() => trackHeroCtaClick('fournisseur')}
                    >
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Je suis un Fournisseur
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 2: SEGMENTATION - "WHO ARE YOU?" */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-12">
                {/* Card 1: For Schools - Full Width */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                >
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 hover:border-green-500 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Left side: Content */}
                      <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                        <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
                          <Building2 className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                          Je suis une École
                        </h2>
                        <p className="text-gray-700 text-xl mb-6 leading-relaxed">
                          (ou un comité de parents)
                        </p>
                        <p className="text-gray-800 text-lg mb-8 leading-relaxed">
                          <strong className="text-green-700">Doublez les profits</strong> de vos projets avec <strong className="text-green-700">20x moins de gestion administrative</strong>. Fini la paperasse et la gestion d'argent comptant.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Link href="/inscription-manager" className="inline-block w-full sm:w-auto">
                            <Button
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-lg min-h-[44px] touch-manipulation"
                            >
                              Lancer ma campagne
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </Link>
                          <Link href="/ecole" className="inline-block w-full sm:w-auto">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-2 border-green-600 text-green-700 hover:bg-green-50 font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-lg min-h-[44px] touch-manipulation"
                            >
                              En savoir plus
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                      {/* Right side: Video */}
                      <div className="bg-gray-100">
                        <LazyYouTubeIframe
                          videoId="SokN6-91aNQ"
                          title="Découvrez Jappuie - Teaser pour les écoles"
                          className="rounded-none"
                        />
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Card 2: For Students - Full Width */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 hover:border-blue-500 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Left side: Video */}
                      <div className="bg-gray-100 order-2 lg:order-1">
                        <LazyYouTubeIframe
                          videoId="_NsJdIu8qtA"
                          title="Découvrez Jappuie - Teaser pour les étudiants"
                          className="rounded-none"
                        />
                      </div>
                      {/* Right side: Content */}
                      <CardContent className="p-8 lg:p-12 flex flex-col justify-center order-1 lg:order-2">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                          <Users className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                          Je suis un Élève
                        </h2>
                        <p className="text-gray-900 text-lg mb-8 leading-relaxed">
                          <strong className="text-blue-800">Transforme ta campagne en jeu</strong>, gagne jusqu'à <strong className="text-blue-800">1000$ pour toi et ton école</strong>, et deviens le <strong className="text-blue-800">#1 du classement</strong>.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Link href="/inscription" className="inline-block w-full sm:w-auto">
                            <Button
                              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-lg min-h-[44px] touch-manipulation"
                            >
                              Commencer à Vendre
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </Link>
                          <Link href="/eleve" className="inline-block w-full sm:w-auto">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-lg min-h-[44px] touch-manipulation"
                            >
                              En savoir plus
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>

                {/* Card 3: For Suppliers - Full Width */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                >
                  <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 border-2 border-purple-300 hover:border-purple-500 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Left side: Content */}
                      <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                        <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mb-6">
                          <ShoppingBag className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                          Je suis un Fournisseur
                        </h2>
                        <p className="text-gray-800 text-xl mb-6 leading-relaxed">
                          (Producteur local, entreprise)
                        </p>
                        <p className="text-gray-900 text-lg mb-8 leading-relaxed">
                          Accédez à un <strong className="text-purple-800">nouveau canal de vente à 0$ de marketing</strong>. Recevez des <strong className="text-purple-800">commandes groupées massives</strong> et laissez-nous gérer toute la logistique.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Link href="/inscription-supplier" className="inline-block w-full sm:w-auto">
                            <Button
                              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-lg min-h-[44px] touch-manipulation"
                            >
                              Devenir Partenaire
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </Link>
                          <Link href="/fournisseur" className="inline-block w-full sm:w-auto">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-2 border-purple-600 text-purple-700 hover:bg-purple-50 font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-lg min-h-[44px] touch-manipulation"
                            >
                              En savoir plus
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                      {/* Right side: Video */}
                      <div className="bg-gray-100">
                        <LazyYouTubeIframe
                          videoId="Abrtl8Q-vvo"
                          title="Découvrez Jappuie - Teaser pour les fournisseurs"
                          className="rounded-none"
                        />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 3: SOCIAL PROOF - THE RESULTS */}
          <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  Des résultats qui parlent d'eux-mêmes.
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Stat 1: For Suppliers */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  style={{ willChange: 'opacity, transform' }}
                  className="text-center"
                >
                  <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all shadow-xl hover:shadow-2xl">
                    <CardContent className="p-8">
                      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingUp className="w-10 h-10 text-purple-600" />
                      </div>
                      <div className="text-6xl font-extrabold text-purple-600 mb-4">
                        x2
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Ventes doublées
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        pour nos partenaires, comme <strong>Massibec</strong> qui est passé de <strong>20k à plus de 40k</strong> en une seule campagne.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Stat 2: For Schools */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                  style={{ willChange: 'opacity, transform' }}
                  className="text-center"
                >
                  <Card className="bg-white border-2 border-green-200 hover:border-green-400 transition-all shadow-xl hover:shadow-2xl">
                    <CardContent className="p-8">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-green-600" />
                      </div>
                      <div className="text-6xl font-extrabold text-green-600 mb-4">
                        -95%
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Moins de gestion
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        Fini la paperasse, le suivi des paiements et la logistique complexe. <strong>Lancez votre campagne en 2 minutes</strong>, pas en 2 semaines.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Stat 3: For Students */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                  style={{ willChange: 'opacity, transform' }}
                  className="text-center"
                >
                  <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-all shadow-xl hover:shadow-2xl">
                    <CardContent className="p-8">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-10 h-10 text-blue-600" />
                      </div>
                      <div className="text-6xl font-extrabold text-blue-600 mb-4">
                        +1000$
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Gagnés par nos meilleurs élèves
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        Notre plateforme transforme la vente en une <strong>compétition motivante</strong>.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  Comment ça marche ?
                </h2>
                <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                  Trois étapes simples pour réussir votre campagne de financement
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  style={{ willChange: 'opacity, transform' }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ willChange: 'transform' }}>
                    <CheckCircle2 className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Créez</h3>
                  <p className="text-gray-700 text-lg">
                    Inscrivez-vous et personnalisez votre boutique en ligne unique en quelques minutes.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ willChange: 'transform' }}>
                    <ShoppingBag className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Vendez</h3>
                  <p className="text-gray-700 text-lg">
                    Partagez votre lien et vendez des produits de qualité de votre fournisseur.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                  style={{ willChange: 'opacity, transform' }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ willChange: 'transform' }}>
                    <Award className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Réussissez</h3>
                  <p className="text-gray-700 text-lg">
                    Atteignez vos objectifs de financement et réalisez vos projets.
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 4: FEATURES & BENEFITS - "WHY JAPPUIE.CA?" */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  Tout ce dont vous avez besoin, sur une seule plateforme.
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1: 100% Numérique */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                >
                  <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-all shadow-lg hover:shadow-xl h-full">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                        <Shield className="w-7 h-7 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">100% Numérique</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Fini les formulaires papier et l'argent comptant. Commandes et paiements en ligne sécurisés.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Feature 2: Gestion Automatisée */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                >
                  <Card className="bg-white border-2 border-green-200 hover:border-green-400 transition-all shadow-lg hover:shadow-xl h-full">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                        <Zap className="w-7 h-7 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Gestion Automatisée</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Nous nous occupons du suivi des commandes individuelles, des paiements et du support client pour que vous n'ayez pas à le faire.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Feature 3: Gamification pour les Élèves */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                >
                  <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all shadow-lg hover:shadow-xl h-full">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                        <Trophy className="w-7 h-7 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Gamification pour les Élèves</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Des boutiques personnalisées et un classement en temps réel qui transforment la vente en une compétition amicale et motivante.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Feature 4: Partenaires Locaux de Qualité */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
                >
                  <Card className="bg-white border-2 border-yellow-200 hover:border-yellow-400 transition-all shadow-lg hover:shadow-xl h-full">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                        <Package className="w-7 h-7 text-yellow-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Partenaires Locaux de Qualité</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Mettez en valeur les entreprises de votre communauté et offrez des produits que les gens aiment vraiment.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Feature 5: Rapports en Temps Réel */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
                  className="md:col-span-2 lg:col-span-1"
                >
                  <Card className="bg-white border-2 border-indigo-200 hover:border-indigo-400 transition-all shadow-lg hover:shadow-xl h-full">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                        <BarChart3 className="w-7 h-7 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Rapports en Temps Réel</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Suivez la performance de votre campagne, les ventes par élève et vos profits en un seul clic depuis un tableau de bord simple et clair.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 5: FINAL CALL TO ACTION */}
          <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ willChange: 'opacity, transform' }}
                className="text-center"
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
                  Prêt à transformer votre prochaine campagne de financement ?
                </h2>
                <p className="text-xl sm:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
                  Rejoignez les écoles, élèves et fournisseurs qui ont découvert la façon simple et rentable de financer leurs projets.
                </p>
                <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 justify-center items-center mb-8 px-2">
                  <Link href="/inscription-manager" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50 font-bold px-5 md:px-10 py-4 md:py-8 text-base md:text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[44px] touch-manipulation"
                    >
                      Je suis une École
                      <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                  </Link>
                  <Link href="/inscription" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-bold px-5 md:px-10 py-4 md:py-8 text-base md:text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[44px] touch-manipulation"
                    >
                      Je suis un Élève
                      <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                  </Link>
                  <Link href="/inscription-supplier" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-purple-700 hover:bg-purple-50 font-bold px-5 md:px-10 py-4 md:py-8 text-base md:text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 min-h-[44px] touch-manipulation"
                    >
                      Je suis un Fournisseur
                      <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                  </Link>
                </div>
                <p className="mt-6 text-blue-100">
                  ✓ Gratuit à démarrer • ✓ Aucun engagement • ✓ Support dédié
                </p>
              </motion.div>
            </div>
          </section>
        </div>

        <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
      </Layout>
    </>
  )
}
