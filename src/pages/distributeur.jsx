// Landing page dédiée pour les distributeurs
import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Truck, TrendingUp, DollarSign, BarChart3, Users, CheckCircle2, Zap, Shield, MapPin, Clock, Award, Package, Gavel } from 'lucide-react'
import { motion } from 'framer-motion'
import { trackLandingPageVisit } from '../lib/funnelAnalytics'

export default function DistributeurLanding() {
    useEffect(() => {
        trackLandingPageVisit('distributeur');
    }, []);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
    const canonicalUrl = `${baseUrl}/distributeur`;
    const title = 'Jappuie pour les Distributeurs - Plateforme d\'Enchères de Livraisons';
    const description = 'Rejoignez la plateforme Jappuie en tant que distributeur. Enchérissez sur les livraisons entre fournisseurs et écoles, développez votre activité logistique et connectez-vous avec des centaines d\'écoles et fournisseurs locaux.';
    const imageUrl = `${baseUrl}/images/jappuie_logo.png`;

    return (
        <>
            <Head>
                {/* Primary Meta Tags */}
                <title>{title}</title>
                <meta name="title" content={title} />
                <meta name="description" content={description} />
                <meta name="keywords" content="distributeur logistique, livraison école, transport scolaire, enchères livraison, plateforme distribution, transporteur local Québec, logistique B2B" />
                <meta name="author" content="Jappuie" />
                <meta name="robots" content="index, follow" />
                <meta name="language" content="French" />
                <meta name="revisit-after" content="7 days" />
                <link rel="canonical" href={canonicalUrl} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={imageUrl} />
                <meta property="og:site_name" content="Jappuie" />
                <meta property="og:locale" content="fr_CA" />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content={canonicalUrl} />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={imageUrl} />

                {/* Structured Data (JSON-LD) */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebPage",
                            "name": title,
                            "description": description,
                            "url": canonicalUrl,
                            "inLanguage": "fr-CA",
                            "isPartOf": {
                                "@type": "WebSite",
                                "name": "Jappuie",
                                "url": baseUrl
                            },
                            "about": {
                                "@type": "Thing",
                                "name": "Plateforme pour distributeurs logistiques"
                            },
                            "primaryImageOfPage": {
                                "@type": "ImageObject",
                                "url": imageUrl
                            }
                        })
                    }}
                />
            </Head>
            <Layout>
                <div className="min-h-screen">
                    {/* Hero Section */}
                    <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-700 to-pink-800 text-white py-20 md:py-32">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                        </div>
                        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="text-center"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-sm">
                                    <Truck className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                                    Pour les Distributeurs
                                </h1>
                                <p className="text-xl md:text-2xl mb-4 text-orange-100">
                                    Enchérissez sur les <strong className="text-white">livraisons entre fournisseurs et écoles</strong>
                                </p>
                                <p className="text-lg md:text-xl mb-8 text-orange-50 max-w-3xl mx-auto">
                                    Développez votre activité logistique en participant à notre système d'enchères. Connectez-vous avec des centaines d'écoles et fournisseurs locaux qui ont besoin de services de livraison.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link href="/inscription-distributor">
                                        <Button
                                            size="lg"
                                            className="bg-white text-orange-700 hover:bg-orange-50 font-bold py-6 px-8 text-lg shadow-xl"
                                        >
                                            Devenir Distributeur
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Key Benefits */}
                    <section className="py-16 bg-white">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Pourquoi devenir distributeur Jappuie ?
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        icon: Gavel,
                                        title: "Système d'enchères",
                                        description: "Enchérissez sur les livraisons disponibles et fixez vos propres prix. Compétition équitable avec d'autres distributeurs pour obtenir les meilleures missions."
                                    },
                                    {
                                        icon: DollarSign,
                                        title: "Prix compétitifs",
                                        description: "Déterminez vos tarifs selon vos coûts et votre marge. Plus vous êtes compétitif, plus vous obtenez de livraisons."
                                    },
                                    {
                                        icon: MapPin,
                                        title: "Accès à un réseau étendu",
                                        description: "Connectez-vous avec des centaines d'écoles et fournisseurs locaux à travers le Québec. Développez votre clientèle sans effort marketing."
                                    },
                                    {
                                        icon: BarChart3,
                                        title: "Tableau de bord complet",
                                        description: "Gérez vos enchères, suivez vos livraisons en temps réel et analysez vos performances depuis un seul endroit."
                                    },
                                    {
                                        icon: Clock,
                                        title: "Flexibilité totale",
                                        description: "Choisissez les livraisons qui vous conviennent selon votre disponibilité et votre zone de couverture."
                                    },
                                    {
                                        icon: TrendingUp,
                                        title: "Croissance de votre activité",
                                        description: "Augmentez votre volume de livraisons sans augmenter vos coûts marketing. Évoluez avec une plateforme qui grandit avec vous."
                                    }
                                ].map((benefit, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                    >
                                        <Card className="h-full border-2 hover:border-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl">
                                            <CardContent className="p-6">
                                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                                                    <benefit.icon className="w-6 h-6 text-orange-600" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                                                <p className="text-gray-600">{benefit.description}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* How It Works */}
                    <section className="py-16 bg-gradient-to-br from-orange-50 to-red-100">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Comment ça fonctionne ?
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { step: "1", title: "Inscrivez-vous", description: "Créez votre compte distributeur en quelques minutes" },
                                    { step: "2", title: "Consultez les livraisons", description: "Parcourez les livraisons disponibles entre fournisseurs et écoles" },
                                    { step: "3", title: "Enchérissez", description: "Proposez votre prix pour chaque livraison et compétitionnez avec d'autres distributeurs" },
                                    { step: "4", title: "Livrez et gagnez", description: "Effectuez les livraisons gagnantes et développez votre activité" }
                                ].map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                        className="text-center"
                                    >
                                        <Card className="border-2 border-orange-300 bg-white shadow-lg h-full">
                                            <CardContent className="p-6">
                                                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <span className="text-2xl font-bold text-white">{item.step}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                                                <p className="text-gray-600">{item.description}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* What You'll Manage */}
                    <section className="py-16 bg-white">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Gérez vos enchères et livraisons
                                </h2>
                                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                    Un tableau de bord complet pour suivre vos enchères, gérer vos livraisons et analyser vos performances
                                </p>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2 border-orange-200 shadow-lg">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Gavel className="w-8 h-8 text-orange-600" />
                                                <h3 className="text-2xl font-bold text-gray-900">Système d'enchères</h3>
                                            </div>
                                            <p className="text-gray-600 mb-4">
                                                Consultez toutes les livraisons disponibles avec les détails complets : point de départ (fournisseur), destination (école), volume, et délais.
                                            </p>
                                            <ul className="space-y-2 text-gray-600">
                                                <li className="flex items-start">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>Voir toutes les livraisons disponibles</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>Proposer votre prix pour chaque livraison</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>Suivre vos enchères en temps réel</span>
                                                </li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2 border-orange-200 shadow-lg">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <BarChart3 className="w-8 h-8 text-orange-600" />
                                                <h3 className="text-2xl font-bold text-gray-900">Suivi des performances</h3>
                                            </div>
                                            <p className="text-gray-600 mb-4">
                                                Analysez vos performances avec des statistiques détaillées sur vos livraisons, vos revenus et votre taux de réussite.
                                            </p>
                                            <ul className="space-y-2 text-gray-600">
                                                <li className="flex items-start">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>Historique de toutes vos livraisons</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>Statistiques de revenus et de volume</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>Évaluation et notation par les clients</span>
                                                </li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-20 bg-gradient-to-br from-orange-600 to-red-700 text-white">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
                                    Prêt à développer votre activité de livraison ?
                                </h2>
                                <p className="text-xl md:text-2xl mb-8 text-orange-100">
                                    Rejoignez la plateforme qui connecte les fournisseurs locaux aux écoles du Québec
                                </p>
                                <Link href="/inscription-distributor">
                                    <Button
                                        size="lg"
                                        className="bg-white text-orange-700 hover:bg-orange-50 font-bold py-6 px-12 text-xl shadow-2xl"
                                    >
                                        Devenir Distributeur Maintenant
                                        <ArrowRight className="ml-2 h-6 w-6" />
                                    </Button>
                                </Link>
                                <p className="mt-6 text-orange-100">
                                    ✓ Inscription gratuite • ✓ Système d'enchères transparent • ✓ Support dédié
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
              `}</style>
            </Layout>
        </>
    );
}

