// Landing page dédiée pour les fournisseurs
import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, ShoppingBag, TrendingUp, Package, DollarSign, BarChart3, Users, CheckCircle2, Zap, Shield, Globe, FileText, Monitor, Smartphone, PackageCheck } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { trackLandingPageVisit } from '../lib/funnelAnalytics'

// Lazy YouTube iframe component
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
            { rootMargin: '50px' }
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
        <div ref={containerRef} className={`aspect-video relative overflow-hidden rounded-lg bg-gray-200 ${className}`}>
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
                        <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Chargement de la vidéo...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function FournisseurLanding() {
    useEffect(() => {
        trackLandingPageVisit('fournisseur');
    }, []);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
    const canonicalUrl = `${baseUrl}/fournisseur`;
    const title = 'Jappuie pour les Fournisseurs - Nouveau Canal de Vente à 0$ de Marketing';
    const description = 'Plateforme de financement scolaire pour les fournisseurs locaux. Accédez à un nouveau canal de vente sans coût marketing, recevez des commandes groupées massives et laissez-nous gérer la logistique.';
    const imageUrl = `${baseUrl}/images/jappuie_logo.png`;

    return (
        <>
            <Head>
                {/* Primary Meta Tags */}
                <title>{title}</title>
                <meta name="title" content={title} />
                <meta name="description" content={description} />
                <meta name="keywords" content="fournisseur financement scolaire, vente produits école, marketplace fournisseurs, commandes groupées, canal vente B2B, producteurs locaux Québec, partenaires fournisseurs" />
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
                                "name": "Plateforme pour fournisseurs de produits scolaires"
                            },
                            "primaryImageOfPage": {
                                "@type": "ImageObject",
                                "url": imageUrl
                            }
                        })
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "Service",
                            "serviceType": "Marketplace B2B pour fournisseurs",
                            "provider": {
                                "@type": "Organization",
                                "name": "Jappuie",
                                "url": baseUrl
                            },
                            "areaServed": {
                                "@type": "Country",
                                "name": "Canada"
                            },
                            "audience": {
                                "@type": "BusinessEntity",
                                "name": "Fournisseurs et producteurs locaux"
                            },
                            "description": description,
                            "offers": {
                                "@type": "Offer",
                                "price": "0",
                                "priceCurrency": "CAD",
                                "description": "Aucun coût marketing, commission sur les ventes uniquement"
                            }
                        })
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "Accueil",
                                    "item": baseUrl
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 2,
                                    "name": "Fournisseurs",
                                    "item": canonicalUrl
                                }
                            ]
                        })
                    }}
                />
            </Head>
            <Layout>
                <div className="min-h-screen">
                    {/* Hero Section */}
                    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-800 text-white py-20 md:py-32">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                        </div>
                        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="text-center"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-sm">
                                    <ShoppingBag className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                                    Pour les Fournisseurs Locaux
                                </h1>
                                <p className="text-xl md:text-2xl mb-4 text-indigo-100">
                                    Accédez à un <strong className="text-white">nouveau canal de vente à 0$ de marketing</strong>
                                </p>
                                <p className="text-lg md:text-xl mb-8 text-indigo-50 max-w-3xl mx-auto">
                                    Recevez des commandes groupées massives et laissez-nous gérer toute la logistique. Rejoignez la marketplace qui connecte les écoles aux meilleurs fournisseurs locaux.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link href="/inscription-supplier">
                                        <Button
                                            size="lg"
                                            className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-6 px-8 text-lg shadow-xl"
                                        >
                                            Devenir Partenaire
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="border-2 border-white text-white hover:bg-white/10 font-bold py-6 px-8 text-lg backdrop-blur-sm"
                                        onClick={() => {
                                            const videoSection = document.getElementById('video-section');
                                            videoSection?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        Voir la démo
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Video Section */}
                    <section id="video-section" className="py-16 bg-gray-50">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5 }}
                                className="text-center mb-8"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Découvrez comment ça fonctionne
                                </h2>
                                <p className="text-lg text-gray-600">
                                    Voyez comment les fournisseurs utilisent Jappuie pour développer leurs ventes
                                </p>
                            </motion.div>
                            <LazyYouTubeIframe
                                videoId="Abrtl8Q-vvo"
                                title="Découvrez Jappuie - Teaser pour les fournisseurs"
                            />
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
                                    Pourquoi devenir partenaire Jappuie ?
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        icon: DollarSign,
                                        title: "0$ de marketing",
                                        description: "Aucun coût marketing. Vous ne payez que lorsque vous vendez. Commission uniquement sur les ventes réussies."
                                    },
                                    {
                                        icon: Package,
                                        title: "Commandes groupées",
                                        description: "Recevez des commandes groupées massives de plusieurs écoles simultanément. Optimisez votre production et réduisez vos coûts."
                                    },
                                    {
                                        icon: BarChart3,
                                        title: "Tableau de bord complet",
                                        description: "Gérez votre catalogue, suivez vos ventes en temps réel et analysez vos performances depuis un seul endroit."
                                    },
                                    {
                                        icon: Users,
                                        title: "Accès à un nouveau marché",
                                        description: "Connectez-vous avec des centaines d'écoles et comités de parents qui cherchent des produits de qualité."
                                    },
                                    {
                                        icon: Shield,
                                        title: "Logistique gérée",
                                        description: "Nous gérons les commandes, les paiements et la coordination avec les écoles. Vous vous concentrez sur la production."
                                    },
                                    {
                                        icon: TrendingUp,
                                        title: "Croissance garantie",
                                        description: "Augmentez vos ventes sans augmenter vos coûts marketing. Évoluez avec une plateforme qui grandit avec vous."
                                    }
                                ].map((benefit, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                    >
                                        <Card className="h-full border-2 hover:border-indigo-500 transition-all duration-300 shadow-lg hover:shadow-xl">
                                            <CardContent className="p-6">
                                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                                                    <benefit.icon className="w-6 h-6 text-indigo-600" />
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

                    {/* Platform Preview Section */}
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
                                    Gérez votre catalogue et vos ventes
                                </h2>
                                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                    Un tableau de bord complet pour gérer vos produits, suivre vos commandes et analyser vos performances
                                </p>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2 border-indigo-200 shadow-lg overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-6 border-b border-indigo-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Package className="w-6 h-6 text-indigo-600" />
                                                    <h3 className="text-xl font-bold text-gray-900">Gestion de catalogue</h3>
                                                </div>
                                                <p className="text-gray-600 text-sm">
                                                    Ajoutez vos produits, gérez vos prix et mettez à jour votre inventaire en quelques clics.
                                                </p>
                                            </div>
                                            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                                                <Image
                                                    src="/images/gestion-des-produits.png"
                                                    alt="Gestion des produits - Catalogue fournisseur Jappuie"
                                                    fill
                                                    className="object-contain"
                                                    priority
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2 border-indigo-200 shadow-lg overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-6 border-b border-indigo-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                                                    <h3 className="text-xl font-bold text-gray-900">Tableau de bord fournisseur</h3>
                                                </div>
                                                <p className="text-gray-600 text-sm">
                                                    Suivez vos ventes, consultez les commandes groupées et analysez vos performances en temps réel.
                                                </p>
                                            </div>
                                            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                                                <Image
                                                    src="/images/performance-produit.png"
                                                    alt="Performance des produits - Tableau de bord fournisseur Jappuie"
                                                    fill
                                                    className="object-contain"
                                                    priority
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="max-w-2xl mx-auto mt-8"
                            >
                                <Card className="border-2 border-indigo-200 shadow-md">
                                    <CardContent className="p-4">
                                        <div className="relative w-full aspect-video rounded-lg bg-gray-100 overflow-hidden mb-3">
                                            <Image
                                                src="/images/commande-massive.png"
                                                alt="Commandes groupées par école - Jappuie"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1">Commandes groupées</h4>
                                        <p className="text-sm text-gray-600">Recevez des commandes massives de plusieurs écoles</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </section>

                    {/* How It Works */}
                    <section className="py-16 bg-gradient-to-br from-indigo-50 to-purple-100">
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
                                    { step: "1", title: "Inscrivez-vous", description: "Créez votre compte fournisseur en quelques minutes" },
                                    { step: "2", title: "Ajoutez vos produits", description: "Téléchargez votre catalogue avec photos, descriptions et prix" },
                                    { step: "3", title: "Les écoles vous découvrent", description: "Les écoles parcourent votre catalogue et créent des campagnes" },
                                    { step: "4", title: "Recevez les commandes", description: "Recevez des commandes groupées et livrez directement aux écoles" }
                                ].map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                        className="text-center"
                                    >
                                        <Card className="border-2 border-indigo-300 bg-white shadow-lg h-full">
                                            <CardContent className="p-6">
                                                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
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

                    {/* CTA Section */}
                    <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
                                    Prêt à développer vos ventes avec Jappuie ?
                                </h2>
                                <p className="text-xl md:text-2xl mb-8 text-indigo-100">
                                    Rejoignez les fournisseurs qui ont déjà augmenté leurs ventes de 200%
                                </p>
                                <Link href="/inscription-supplier">
                                    <Button
                                        size="lg"
                                        className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-6 px-12 text-xl shadow-2xl"
                                    >
                                        Devenir Partenaire Maintenant
                                        <ArrowRight className="ml-2 h-6 w-6" />
                                    </Button>
                                </Link>
                                <p className="mt-6 text-indigo-100">
                                    ✓ Inscription gratuite • ✓ Aucun coût marketing • ✓ Support dédié
                                </p>
                            </motion.div>
                        </div>
                    </section>
                </div>
            </Layout>
        </>
    );
}

