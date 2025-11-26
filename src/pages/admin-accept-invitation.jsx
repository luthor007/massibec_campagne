import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';

export default function AdminAcceptInvitation() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { token } = router.query;
    const [loading, setLoading] = useState(false);
    const [invitation, setInvitation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push(`/connexion?redirect=/admin-accept-invitation?token=${token}`);
            return;
        }

        // Verify invitation token
        if (token) {
            verifyInvitation();
        }
    }, [token, session, status]);

    const verifyInvitation = async () => {
        try {
            // We'll verify on accept, but we can show a message here
            setInvitation({ token });
        } catch (err) {
            setError('Erreur lors de la vérification de l\'invitation');
        }
    };

    const handleAccept = async () => {
        if (!token) {
            setError('Token d\'invitation manquant');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/accept-invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Invitation acceptée avec succès!');
                setTimeout(() => {
                    router.push('/admin-jappuie-dashboard');
                }, 1500);
            } else {
                setError(data.message || 'Erreur lors de l\'acceptation de l\'invitation');
            }
        } catch (err) {
            console.error('Error accepting invitation:', err);
            setError('Erreur lors de l\'acceptation de l\'invitation');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Chargement...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!session) {
        return null; // Will redirect
    }

    return (
        <>
            <Head>
                <title>Accepter l'invitation Admin - Jappuie</title>
            </Head>
            <Layout>
                <div className="min-h-screen flex items-center justify-center py-12">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Invitation Admin Jappuie</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                    {error}
                                </div>
                            )}

                            {!error && (
                                <div className="space-y-4">
                                    <p className="text-gray-700">
                                        Vous avez été invité à devenir gestionnaire admin de la plateforme Jappuie.
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        En acceptant cette invitation, vous aurez accès au tableau de bord admin pour gérer la plateforme.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <Button
                                    onClick={handleAccept}
                                    disabled={loading || !!error}
                                    className="flex-1"
                                >
                                    {loading ? 'Traitement...' : 'Accepter l\'invitation'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/')}
                                    disabled={loading}
                                >
                                    Annuler
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        </>
    );
}

