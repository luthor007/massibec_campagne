import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Play, ArrowRight, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function JoinCampaign() {
    const router = useRouter();
    const { campaignId, token } = router.query;
    const [validating, setValidating] = useState(true);
    const [valid, setValid] = useState(false);
    const [campaign, setCampaign] = useState(null);
    const [error, setError] = useState(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    useEffect(() => {
        if (campaignId && token) {
            validateToken();
        }
    }, [campaignId, token]);

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/campaigns/${campaignId}/validate-join-token?token=${token}`);
            const data = await response.json();

            if (response.ok && data.valid) {
                setValid(true);
                setCampaign(data.campaign);
                // Store token and campaignId in sessionStorage for registration
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('joinCampaignToken', token);
                    sessionStorage.setItem('joinCampaignId', campaignId);
                    // Initialize selectedGroupId to "Autre" if groups are enabled
                    if (data.campaign?.groups?.enabled && data.campaign?.groups?.list) {
                        const validGroups = data.campaign.groups.list.map(g => g.name);
                        const defaultGroup = validGroups.includes('Autre') ? 'Autre' : (validGroups[0] || null);
                        setSelectedGroupId(defaultGroup);
                        sessionStorage.setItem('joinCampaignGroupId', defaultGroup);
                    }
                }
            } else {
                setValid(false);
                setError(data.message || 'Token invalide ou expiré');
            }
        } catch (error) {
            console.error('Error validating token:', error);
            setValid(false);
            setError('Erreur lors de la validation du lien');
        } finally {
            setValidating(false);
        }
    };

    const handleStartSelling = () => {
        // Store selected group in sessionStorage if groups are enabled
        if (selectedGroupId && typeof window !== 'undefined') {
            sessionStorage.setItem('joinCampaignGroupId', selectedGroupId);
        }
        // Redirect to registration with campaign info
        router.push(`/inscription?campaignId=${campaignId}&token=${token}`);
    };

    const handleGroupChange = (groupId) => {
        setSelectedGroupId(groupId);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('joinCampaignGroupId', groupId);
        }
    };

    if (validating) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Validation du lien...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!valid) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <Card className="max-w-md w-full">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-red-600">
                                <AlertCircle className="h-6 w-6" />
                                <span>Lien invalide</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 mb-4">
                                {error || 'Ce lien de participation est invalide ou a expiré.'}
                            </p>
                            <Button onClick={() => router.push('/')} className="w-full">
                                Retour à l'accueil
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Success Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                            Bienvenue dans la campagne !
                        </h1>
                        <p className="text-lg text-gray-600">
                            {campaign?.school?.name || 'Votre école'} - Campagne #{campaign?.campaignNumber || ''}
                        </p>
                    </motion.div>

                    {/* Video Section 
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Play className="h-6 w-6 text-blue-600" />
                                <span>Vidéo explicative</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                                {!videoPlaying ? (
                                    <div className="text-center">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setVideoPlaying(true)}
                                            className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
                                        >
                                            <Play className="h-10 w-10 text-white ml-1" />
                                        </motion.button>
                                        <p className="mt-4 text-gray-600">Cliquez pour regarder la vidéo</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <div className="text-center text-white">
                                            <p className="text-lg mb-2">Vidéo à venir</p>
                                            <p className="text-sm text-gray-400">
                                                La vidéo tutoriel sera disponible prochainement
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Ce que vous apprendrez :</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Comment créer votre boutique en ligne</li>
                                    <li>• Comment partager votre lien unique</li>
                                    <li>• Comment suivre vos ventes et profits</li>
                                    <li>• Comment passer votre commande finale</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                    */}

                    {/* Group Selection - Only show if groups are enabled */}
                    {campaign?.groups?.enabled && campaign?.groups?.list && campaign.groups.list.length > 0 && (
                        <Card className="mb-8 max-w-2xl mx-auto">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="h-5 w-5 text-purple-600" />
                                    <span>Choisissez votre groupe</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Sélectionnez le groupe auquel vous appartenez. Cela vous permettra de voir votre classement par groupe.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="groupId" className="text-sm font-medium">
                                            Groupe
                                        </Label>
                                        <Select
                                            value={selectedGroupId || ''}
                                            onValueChange={handleGroupChange}
                                        >
                                            <SelectTrigger id="groupId" className="w-full">
                                                <SelectValue placeholder="Sélectionnez un groupe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {campaign.groups.list.map((group) => {
                                                    const groupName = typeof group === 'string' ? group : group.name;
                                                    return (
                                                        <SelectItem key={groupName} value={groupName}>
                                                            {groupName}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                        {selectedGroupId && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Vous serez assigné au groupe <strong>{selectedGroupId}</strong>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-2">1</div>
                                <h3 className="font-semibold mb-2">Inscrivez-vous</h3>
                                <p className="text-sm text-gray-600">
                                    Créez votre compte en quelques minutes
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">2</div>
                                <h3 className="font-semibold mb-2">Personnalisez</h3>
                                <p className="text-sm text-gray-600">
                                    Configurez votre boutique et partagez votre lien
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="text-3xl font-bold text-purple-600 mb-2">3</div>
                                <h3 className="font-semibold mb-2">Vendez</h3>
                                <p className="text-sm text-gray-600">
                                    Suivez vos ventes et atteignez vos objectifs
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                onClick={handleStartSelling}
                                size="lg"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold shadow-lg"
                            >
                                Commencer à vendre
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </motion.div>
                        <p className="mt-4 text-sm text-gray-600">
                            La campagne sera automatiquement ajoutée à votre compte après l'inscription
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}



