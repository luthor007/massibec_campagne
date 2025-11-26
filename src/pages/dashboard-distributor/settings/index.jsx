import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const DistributorSettingsPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        nomEntreprise: '',
        telephone: '',
        adresse: '',
        ville: '',
        codePostal: ''
    });

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/connexion');
            return;
        }
        if (session.user.role !== 'distributor') {
            router.push('/dashboard');
            return;
        }
    }, [session, status, router]);

    useEffect(() => {
        if (session?.user?.role === 'distributor') {
            loadUserData();
        }
    }, [session]);

    const loadUserData = async () => {
        try {
            setLoading(true);
            // Try to load from session first (for faster initial load)
            if (session?.user?.distributorInfo) {
                const distributorInfo = session.user.distributorInfo;
                setFormData({
                    nomEntreprise: distributorInfo.nomEntreprise || '',
                    telephone: distributorInfo.telephone || '',
                    adresse: distributorInfo.adresse || '',
                    ville: distributorInfo.ville || '',
                    codePostal: distributorInfo.codePostal || ''
                });
            }

            // Always fetch from API to get the latest data
            const response = await fetch('/api/distributor/settings');
            if (response.ok) {
                const data = await response.json();
                if (data.distributorInfo) {
                    setFormData({
                        nomEntreprise: data.distributorInfo.nomEntreprise || '',
                        telephone: data.distributorInfo.telephone || '',
                        adresse: data.distributorInfo.adresse || '',
                        ville: data.distributorInfo.ville || '',
                        codePostal: data.distributorInfo.codePostal || ''
                    });
                }
            } else if (!session?.user?.distributorInfo) {
                // Only show error if we don't have session data as fallback
                toast.error('Erreur lors du chargement des données');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            if (!session?.user?.distributorInfo) {
                toast.error('Erreur lors du chargement des données');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/distributor/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Paramètres sauvegardés avec succès');
                // Optionally reload the page to refresh session data
                // Or update session manually if needed
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Chargement...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!session || session.user.role !== 'distributor') {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                        Paramètres
                    </h1>
                    <p className="text-gray-600">
                        Gérez vos informations de profil
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Informations du distributeur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="nomEntreprise">Nom de l'entreprise</Label>
                                    <Input
                                        id="nomEntreprise"
                                        value={formData.nomEntreprise}
                                        onChange={(e) => setFormData({ ...formData, nomEntreprise: e.target.value })}
                                        className="mt-1"
                                        placeholder="Transport ABC Inc."
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="telephone">Téléphone</Label>
                                    <Input
                                        id="telephone"
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                        className="mt-1"
                                        placeholder="(514) 123-4567"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <Label htmlFor="adresse">Adresse</Label>
                                    <Input
                                        id="adresse"
                                        value={formData.adresse}
                                        onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                                        className="mt-1"
                                        placeholder="123 Rue Principale"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="ville">Ville</Label>
                                    <Input
                                        id="ville"
                                        value={formData.ville}
                                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                                        className="mt-1"
                                        placeholder="Montréal"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="codePostal">Code postal</Label>
                                    <Input
                                        id="codePostal"
                                        value={formData.codePostal}
                                        onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                                        className="mt-1"
                                        placeholder="H1A 1A1"
                                    />
                                </div>
                            </div>


                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default DistributorSettingsPage;

