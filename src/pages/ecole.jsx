// Landing page dédiée pour les écoles
import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Building2, TrendingUp, Clock, Shield, BarChart3, Users, CheckCircle2, Zap, Award, DollarSign, FileText, Percent, Monitor, Smartphone, Tablet, UserPlus, Settings } from 'lucide-react'
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

export default function EcoleLanding() {
    useEffect(() => {
        trackLandingPageVisit('ecole');
    }, []);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
    const canonicalUrl = `${baseUrl}/ecole`;
    const title = 'Jappuie pour les Écoles - Doublez vos Profits avec 20x Moins de Gestion';
    const description = 'Plateforme de financement scolaire pour les écoles et comités de parents. Doublez vos profits, automatisez la gestion, connectez-vous avec des fournisseurs locaux. Lancez votre campagne en 2 minutes.';
    const imageUrl = `${baseUrl}/images/jappuie_logo.png`;

    return (
        <>
            <Head>
                {/* Primary Meta Tags */}
                <title>{title}</title>
                <meta name="title" content={title} />
                <meta name="description" content={description} />
                <meta name="keywords" content="financement scolaire, campagne de financement école, collecte de fonds école, gestion automatique campagne, fournisseurs locaux Québec, comité de parents, vente produits école" />
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
                                "name": "Financement scolaire pour les écoles"
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
                            "serviceType": "Plateforme de financement scolaire",
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
                                "@type": "EducationalOrganization",
                                "name": "Écoles et comités de parents"
                            },
                            "description": description,
                            "offers": {
                                "@type": "Offer",
                                "price": "0",
                                "priceCurrency": "CAD"
                            }
                        })
                    }}
                />
            </Head>
            <Layout>
                <div className="min-h-screen">
                    {/* Hero Section */}
                    <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 text-white py-20 md:py-32">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                        </div>
                        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="text-center"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-sm">
                                    <Building2 className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                                    Pour les Écoles et Comités de Parents
                                </h1>
                                <p className="text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4 text-green-100 px-4">
                                    Doublez vos profits avec <strong className="text-white">20x moins de gestion administrative</strong>
                                </p>
                                <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-green-50 max-w-3xl mx-auto px-4">
                                    Fini la paperasse et la gestion d'argent comptant. Lancez votre campagne de financement en 2 minutes.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                                    <Link href="/inscription-manager" className="w-full sm:w-auto">
                                        <Button
                                            size="lg"
                                            className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50 font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg shadow-xl min-h-[44px] touch-manipulation"
                                        >
                                            Lancer ma campagne
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 font-bold py-4 sm:py-6 px-6 sm:px-8 text-base sm:text-lg backdrop-blur-sm min-h-[44px] touch-manipulation"
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
                                    Découvrez Jappuie en 2 minutes
                                </h2>
                                <p className="text-lg text-gray-600">
                                    Voyez comment des écoles comme la vôtre doublent leurs profits
                                </p>
                            </motion.div>
                            <LazyYouTubeIframe
                                videoId="SokN6-91aNQ"
                                title="Découvrez Jappuie - Teaser pour les écoles"
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
                                    Pourquoi choisir Jappuie pour votre école ?
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        icon: TrendingUp,
                                        title: "Doublez vos profits",
                                        description: "Connectez-vous avec plusieurs fournisseurs locaux et maximisez vos revenus avec des produits de qualité."
                                    },
                                    {
                                        icon: Clock,
                                        title: "95% moins de gestion",
                                        description: "Tout est automatisé : commandes, paiements, livraisons. Fini la paperasse et l'argent comptant."
                                    },
                                    {
                                        icon: BarChart3,
                                        title: "Rapports en temps réel",
                                        description: "Suivez vos ventes, profits et statistiques en direct depuis votre tableau de bord."
                                    },
                                    {
                                        icon: Users,
                                        title: "Gestion d'équipe",
                                        description: "Invitez d'autres gestionnaires et travaillez en équipe sur vos campagnes."
                                    },
                                    {
                                        icon: Shield,
                                        title: "100% sécurisé",
                                        description: "Paiements sécurisés, données protégées. Conforme aux normes de sécurité les plus strictes."
                                    },
                                    {
                                        icon: Zap,
                                        title: "Lancement en 2 minutes",
                                        description: "Créez votre campagne, sélectionnez vos produits et lancez-vous. C'est aussi simple que ça."
                                    }
                                ].map((benefit, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                    >
                                        <Card className="h-full border-2 hover:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl">
                                            <CardContent className="p-4 sm:p-6">
                                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                                                    <benefit.icon className="w-6 h-6 text-green-600" />
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                                                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{benefit.description}</p>
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
                                    Voir la plateforme en action
                                </h2>
                                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                    Découvrez comment Jappuie simplifie la gestion de vos campagnes de financement
                                </p>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                    className="space-y-4"
                                >
                                    <Card className="border-2 border-green-200 shadow-lg overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 border-b border-green-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Monitor className="w-6 h-6 text-green-600" />
                                                    <h3 className="text-xl font-bold text-gray-900">Tableau de bord de campagne</h3>
                                                </div>
                                                <p className="text-gray-600 text-sm">
                                                    Suivez vos ventes en temps réel, consultez les statistiques par élève et gérez votre campagne depuis un seul endroit.
                                                </p>
                                            </div>
                                            <div className="relative aspect-video w-full bg-gray-50">
                                                <Image
                                                    src="/images/screenshots/ecole/dashboard-campaign.png"
                                                    alt="Tableau de bord de campagne - Suivez vos ventes en temps réel"
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 50vw"
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
                                    className="space-y-4"
                                >
                                    <Card className="border-2 border-green-200 shadow-lg overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 border-b border-green-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <FileText className="w-6 h-6 text-green-600" />
                                                    <h3 className="text-xl font-bold text-gray-900">Création de campagne</h3>
                                                </div>
                                                <p className="text-gray-600 text-sm">
                                                    Créez votre campagne en quelques clics : sélectionnez un fournisseur, choisissez vos produits et configurez vos objectifs.
                                                </p>
                                            </div>
                                            <div className="relative aspect-video w-full bg-gray-50">
                                                <Image
                                                    src="/images/screenshots/ecole/create-campaign.png"
                                                    alt="Création de campagne - Sélectionnez un fournisseur et configurez vos objectifs"
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    priority
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                >
                                    <Card className="border-2 border-green-200 shadow-md overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="relative aspect-video w-full bg-gray-50">
                                                <Image
                                                    src="/images/screenshots/ecole/reports.png"
                                                    alt="Rapports détaillés - Statistiques complètes de votre campagne"
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-bold text-gray-900 mb-1">Rapports détaillés</h4>
                                                <p className="text-sm text-gray-600">Statistiques complètes de votre campagne</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                >
                                    <Card className="border-2 border-green-200 shadow-md overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="relative aspect-video w-full bg-gray-50">
                                                <Image
                                                    src="/images/screenshots/ecole/invite-manager.png"
                                                    alt="Gérer les informations de l'école et ajouter d'autres personnes"
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Settings className="w-5 h-5 text-green-600" />
                                                    <h4 className="font-bold text-gray-900">Gérez votre école</h4>
                                                </div>
                                                <p className="text-sm text-gray-600">Gérez les informations de votre école et ajoutez d'autres personnes à votre équipe</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                >
                                    <Card className="border-2 border-green-200 shadow-md overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="relative aspect-video w-full bg-gray-50">
                                                <Image
                                                    src="/images/screenshots/ecole/boutique-mobile.png"
                                                    alt="Boutique mobile - Gérez votre campagne depuis n'importe où"
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-bold text-gray-900 mb-1">100% Mobile</h4>
                                                <p className="text-sm text-gray-600">Boutique étudiante accessible sur mobile</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* Social Proof */}
                    <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-100">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Des résultats qui parlent d'eux-mêmes
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { icon: TrendingUp, value: "x2", label: "Ventes", description: "Doublez vos profits par rapport aux méthodes traditionnelles" },
                                    { icon: Clock, value: "-95%", label: "Moins de gestion", description: "Réduction drastique du temps administratif" },
                                    { icon: DollarSign, value: "+1000$", label: "Gagnés", description: "Par les meilleurs élèves" }
                                ].map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                        className="text-center"
                                    >
                                        <Card className="border-2 border-green-300 bg-white shadow-lg">
                                            <CardContent className="p-8">
                                                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <stat.icon className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="text-4xl font-extrabold text-green-700 mb-2">{stat.value}</div>
                                                <div className="text-xl font-bold text-gray-900 mb-2">{stat.label}</div>
                                                <p className="text-gray-600">{stat.description}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-20 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
                                    Prêt à transformer votre prochaine campagne de financement ?
                                </h2>
                                <p className="text-xl md:text-2xl mb-8 text-green-100">
                                    Rejoignez les écoles qui ont déjà doublé leurs profits avec Jappuie
                                </p>
                                <Link href="/inscription-manager">
                                    <Button
                                        size="lg"
                                        className="bg-white text-green-700 hover:bg-green-50 font-bold py-6 px-12 text-xl shadow-2xl"
                                    >
                                        Lancer ma Campagne en 2 Minutes
                                        <ArrowRight className="ml-2 h-6 w-6" />
                                    </Button>
                                </Link>
                                <p className="mt-6 text-green-100">
                                    ✓ Gratuit • ✓ Aucun engagement • ✓ Support dédié
                                </p>
                            </motion.div>
                        </div>
                    </section>
                </div>
            </Layout>
        </>
    );
}

