// Landing page dédiée pour les élèves
import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Users, Trophy, ShoppingBag, CheckCircle2, Zap, Award, DollarSign, Sparkles, TrendingUp, Star, Smartphone } from 'lucide-react'
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

export default function EleveLanding() {
    useEffect(() => {
        trackLandingPageVisit('student');
    }, []);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
    const canonicalUrl = `${baseUrl}/eleve`;
    const title = 'Jappuie pour les Élèves - Vendez et Gagnez avec Votre Boutique Personnalisée';
    const description = 'Plateforme de financement scolaire pour les élèves. Créez votre boutique personnalisée, vendez des produits de qualité et gagnez de l\'argent pour votre école. Gamification et récompenses incluses.';
    const imageUrl = `${baseUrl}/images/jappuie_logo.png`;

    return (
        <>
            <Head>
                {/* Primary Meta Tags */}
                <title>{title}</title>
                <meta name="title" content={title} />
                <meta name="description" content={description} />
                <meta name="keywords" content="financement scolaire élève, vente produits élève, boutique personnalisée, campagne financement étudiant, gagner argent école, gamification scolaire" />
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
                                "name": "Financement scolaire pour les élèves"
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
                            "serviceType": "Plateforme de financement scolaire pour élèves",
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
                                "@type": "EducationalAudience",
                                "educationalRole": "student"
                            },
                            "description": description
                        })
                    }}
                />
            </Head>
            <Layout>
                <div className="min-h-screen">
                    {/* Hero Section */}
                    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 text-white py-20 md:py-32">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
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
                                    <Users className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                                    Pour les Élèves
                                </h1>
                                <p className="text-xl md:text-2xl mb-4 text-blue-100">
                                    Créez votre <strong className="text-white">boutique personnalisée</strong> et vendez en ligne
                                </p>
                                <p className="text-lg md:text-xl mb-8 text-blue-50 max-w-3xl mx-auto">
                                    Gagnez de l'argent pour votre école tout en développant vos compétences entrepreneuriales. C'est amusant, facile et récompensant !
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link href="/inscription">
                                        <Button
                                            size="lg"
                                            className="bg-white text-blue-700 hover:bg-blue-50 font-bold py-6 px-8 text-lg shadow-xl"
                                        >
                                            Créer ma boutique
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
                                    Découvrez comment ça marche
                                </h2>
                                <p className="text-lg text-gray-600">
                                    Voyez comment créer votre boutique et commencer à vendre
                                </p>
                            </motion.div>
                            <LazyYouTubeIframe
                                videoId="_NsJdIu8qtA"
                                title="Découvrez Jappuie - Teaser pour les élèves"
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
                                    Pourquoi les élèves adorent Jappuie ?
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        icon: ShoppingBag,
                                        title: "Boutique personnalisée",
                                        description: "Créez votre propre boutique en ligne avec votre nom, votre photo et votre style. Partagez-la facilement avec votre famille et vos amis."
                                    },
                                    {
                                        icon: Trophy,
                                        title: "Gamification et récompenses",
                                        description: "Gagnez des badges, atteignez vos objectifs et montez dans le classement. C'est amusant et motivant !"
                                    },
                                    {
                                        icon: DollarSign,
                                        title: "Gagnez de l'argent",
                                        description: "Chaque vente rapporte à votre école ET vous donne accès à des tirages et récompenses. Plus vous vendez, plus vous gagnez !"
                                    },
                                    {
                                        icon: Zap,
                                        title: "100% en ligne",
                                        description: "Tout se fait depuis votre téléphone ou ordinateur. Pas besoin de transporter des produits ou de l'argent."
                                    },
                                    {
                                        icon: TrendingUp,
                                        title: "Suivez vos progrès",
                                        description: "Voyez en temps réel combien vous avez vendu, votre objectif personnel et votre classement parmi les autres élèves."
                                    },
                                    {
                                        icon: Award,
                                        title: "Développez vos compétences",
                                        description: "Apprenez l'entrepreneuriat, la communication et la vente tout en aidant votre école. Une expérience enrichissante !"
                                    }
                                ].map((benefit, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                    >
                                        <Card className="h-full border-2 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl">
                                            <CardContent className="p-6">
                                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                                    <benefit.icon className="w-6 h-6 text-blue-600" />
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
                                    Votre boutique personnalisée
                                </h2>
                                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                    Créez une boutique unique qui reflète votre personnalité et partagez-la avec votre réseau
                                </p>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Card className="border-2 border-blue-200 shadow-lg overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 border-b border-blue-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                                                    <h3 className="text-xl font-bold text-gray-900">Boutique personnalisée</h3>
                                                </div>
                                                <p className="text-gray-600 text-sm">
                                                    Créez votre boutique en ligne personnalisée avec votre nom et votre photo. Affichez vos produits, suivez vos ventes et partagez facilement votre lien unique.
                                                </p>
                                            </div>
                                            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                                                <img
                                                    src="/images/boutique-eleve.png"
                                                    alt="Boutique personnalisée de l'élève"
                                                    className="w-full h-full object-cover"
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
                                    <Card className="border-2 border-blue-200 shadow-lg overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 border-b border-blue-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Trophy className="w-6 h-6 text-blue-600" />
                                                    <h3 className="text-xl font-bold text-gray-900">Classement en temps réel</h3>
                                                </div>
                                                <p className="text-gray-600 text-sm">
                                                    Consultez le classement en temps réel, voyez votre position parmi tous les élèves et défiez vos amis pour monter dans les rangs et devenir #1.
                                                </p>
                                            </div>
                                            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                                                <img
                                                    src="/images/classement.png"
                                                    alt="Classement en temps réel des élèves"
                                                    className="w-full h-full object-cover"
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
                                    <Card className="border-2 border-blue-200 shadow-md">
                                        <CardContent className="p-4">
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                                                <img
                                                    src="/images/statistique-de-campagne.png"
                                                    alt="Statistiques de campagne"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <h4 className="font-bold text-gray-900 mb-1">Statistiques de campagne</h4>
                                            <p className="text-sm text-gray-600">Suivez vos ventes, vos profits et vos progrès en temps réel avec des graphiques détaillés</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                >
                                    <Card className="border-2 border-blue-200 shadow-md">
                                        <CardContent className="p-4">
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                                                <img
                                                    src="/images/generate-poster.png"
                                                    alt="Génération d'affiche personnalisée"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <h4 className="font-bold text-gray-900 mb-1">Générateur d'affiche</h4>
                                            <p className="text-sm text-gray-600">Créez des affiches personnalisées avec votre code QR pour promouvoir votre boutique facilement</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                >
                                    <Card className="border-2 border-blue-200 shadow-md">
                                        <CardContent className="p-4">
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                                                <img
                                                    src="/images/gestion-des-commandes.png"
                                                    alt="Gestion des commandes"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <h4 className="font-bold text-gray-900 mb-1">Gestion des commandes</h4>
                                            <p className="text-sm text-gray-600">Suivez toutes vos commandes, leurs statuts et gérez vos ventes en un seul endroit</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* How It Works */}
                    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-center mb-12"
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Comment ça marche ?
                                </h2>
                            </motion.div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { step: "1", title: "Rejoignez une campagne", description: "Utilisez le code de votre école ou scannez le QR code" },
                                    { step: "2", title: "Créez votre boutique", description: "Personnalisez votre boutique avec votre nom et votre photo" },
                                    { step: "3", title: "Partagez votre lien", description: "Envoyez votre lien unique à votre famille et vos amis" },
                                    { step: "4", title: "Gagnez des récompenses", description: "Suivez vos ventes et gagnez des badges et des prix" }
                                ].map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                        className="text-center"
                                    >
                                        <Card className="border-2 border-blue-300 bg-white shadow-lg h-full">
                                            <CardContent className="p-6">
                                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 text-white">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
                                    Prêt à créer votre boutique et commencer à vendre ?
                                </h2>
                                <p className="text-xl md:text-2xl mb-8 text-blue-100">
                                    Rejoignez des milliers d'élèves qui utilisent déjà Jappuie
                                </p>
                                <Link href="/inscription">
                                    <Button
                                        size="lg"
                                        className="bg-white text-blue-700 hover:bg-blue-50 font-bold py-6 px-12 text-xl shadow-2xl"
                                    >
                                        Créer ma Boutique Maintenant
                                        <ArrowRight className="ml-2 h-6 w-6" />
                                    </Button>
                                </Link>
                                <p className="mt-6 text-blue-100">
                                    ✓ Gratuit • ✓ Facile • ✓ Payant
                                </p>
                            </motion.div>
                        </div>
                    </section>
                </div>
            </Layout>
        </>
    );
}

