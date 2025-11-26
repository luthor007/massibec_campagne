import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function VerifyEmail() {
    const router = useRouter();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Vérification en cours...');

    useEffect(() => {
        const { token } = router.query;

        if (!token) {
            setStatus('error');
            setMessage('Token de vérification manquant');
            setTimeout(() => {
                router.push('/email-verification-error');
            }, 2000);
            return;
        }

        // Call the API to verify the email
        fetch(`/api/verify-email?token=${token}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json' // Request JSON response instead of redirect
            }
        })
            .then(async response => {
                if (response.ok) {
                    return response.json();
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erreur lors de la vérification' }));
                    throw new Error(errorData.message || 'Erreur lors de la vérification');
                }
            })
            .then(data => {
                if (data && data.success) {
                    setStatus('success');
                    setMessage('Email vérifié avec succès !');
                    // Redirect to email-verified page using the redirectUrl from API
                    setTimeout(() => {
                        if (data.redirectUrl) {
                            window.location.href = data.redirectUrl;
                        } else {
                            router.push('/email-verified');
                        }
                    }, 1500);
                } else {
                    setStatus('error');
                    setMessage(data?.message || 'Erreur lors de la vérification');
                    setTimeout(() => {
                        router.push('/email-verification-error');
                    }, 3000);
                }
            })
            .catch(error => {
                console.error('Error verifying email:', error);
                setStatus('error');
                setMessage('Erreur lors de la vérification de l\'email');
                // Redirect to error page after a delay
                setTimeout(() => {
                    router.push('/email-verification-error');
                }, 3000);
            });
    }, [router.query, router]);

    return (
        <>
            <Head>
                <title>Vérification de l'email - Jappuie</title>
            </Head>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8 p-8">
                    <div className="text-center">
                        {status === 'loading' && (
                            <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <h2 className="text-2xl font-bold text-gray-900">Vérification en cours...</h2>
                                <p className="mt-2 text-gray-600">{message}</p>
                            </>
                        )}
                        {status === 'success' && (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Email vérifié !</h2>
                                <p className="mt-2 text-gray-600">{message}</p>
                                <p className="mt-4 text-sm text-gray-500">Redirection en cours...</p>
                            </>
                        )}
                        {status === 'error' && (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Erreur de vérification</h2>
                                <p className="mt-2 text-gray-600">{message}</p>
                                <p className="mt-4 text-sm text-gray-500">Redirection vers la page d'erreur...</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

