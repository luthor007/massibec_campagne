// src/pages/email-verified.jsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Layout from '../components/Layout';

const EmailVerified = () => {
  const router = useRouter();
  const { token, userId } = router.query;
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const autoLogin = async () => {
      if (!token || !userId) {
        setStatus('error');
        setError('Token ou ID utilisateur manquant');
        return;
      }

      try {
        // Fetch user email using the userId
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) {
          throw new Error('Impossible de récupérer les informations utilisateur');
        }
        const user = await userResponse.json();

        // Auto-login using NextAuth with magic token
        const result = await signIn('credentials', {
          redirect: false,
          email: user.email,
          password: 'MAGIC_LOGIN_TOKEN',
          loginToken: token,
        });

        if (result?.error) {
          throw new Error('Erreur lors de la connexion automatique');
        }

        if (result?.ok) {
          setStatus('success');

          // Determine redirect path based on user role
          let redirectPath = '/dashboard';
          if (user.role === 'supplier' || user.role === 'fournisseur') {
            redirectPath = '/dashboard-supplier/products?onboarding=true';
          } else if (user.role === 'school_manager') {
            redirectPath = '/dashboard-manager';
          } else if (user.role === 'distributor') {
            redirectPath = '/dashboard-distributor';
          }

          // Redirect to appropriate dashboard after 2 seconds
          setTimeout(() => {
            router.push(redirectPath);
          }, 2000);
        }
      } catch (err) {
        console.error('Auto-login error:', err);
        setStatus('error');
        setError(err.message);
      }
    };

    if (token && userId) {
      autoLogin();
    }
  }, [token, userId, router]);

  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col justify-center items-center p-12 text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-3xl font-bold text-blue-600 mb-4">Vérification en cours...</h1>
            <p className="text-lg mb-4">Connexion automatique à votre compte...</p>
            <div className="text-5xl animate-spin mt-8">⟳</div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-3xl font-bold text-blue-600 mb-4">Bienvenue{router.query.name ? ` ${decodeURIComponent(router.query.name)}` : ''} ! 🎉</h1>
            <p className="text-lg mb-2">Votre email a été vérifié et vous êtes maintenant connecté.</p>
            <p className="text-md text-gray-600">Redirection vers votre tableau de bord...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-3xl font-bold text-red-600 mb-4">Erreur de connexion</h1>
            <p className="text-lg mb-4">{error || 'Une erreur est survenue lors de la connexion automatique.'}</p>
            <Link href="/connexion" className="inline-block mt-5 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Se connecter manuellement
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
};

export default EmailVerified;