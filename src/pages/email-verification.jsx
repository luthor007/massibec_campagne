import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

const EmailVerification = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Get user email from session or sessionStorage
    if (status === 'loading') return;
    
    if (session?.user?.email) {
      setUserEmail(session.user.email);
    } else {
      // Check if email is stored in sessionStorage (from registration)
      const storedEmail = sessionStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        setUserEmail(storedEmail);
      }
    }
  }, [session, status]);

  useEffect(() => {
    // Only start checking if we have an email
    if (!userEmail) return;
    
    const checkVerification = async () => {
      try {
        if (session?.user?.id) {
          // User is logged in on this tab/device
          const response = await fetch(`/api/users/${session.user.id}`);
          const user = await response.json();
          
          if (user.emailVerified) {
            // Email is verified, show welcome message then redirect
            handleVerified();
          }
        } else {
          // User not logged in on this tab - check if their email is verified
          const response = await fetch('/api/check-email-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.emailVerified) {
              // Email is verified, try to auto-login if we have a valid token
              if (data.loginToken && data.loginTokenExpires && new Date(data.loginTokenExpires) > Date.now()) {
                try {
                  // Auto-login using the token
                  const loginResult = await signIn('credentials', {
                    redirect: false,
                    email: data.userEmail,
                    password: 'MAGIC_LOGIN_TOKEN',
                    loginToken: data.loginToken,
                  });

                  if (loginResult?.ok) {
                    // Successfully logged in, show welcome then redirect
                    handleVerified();
                  } else {
                    // Token expired or invalid, redirect to login
                    sessionStorage.removeItem('pendingVerificationEmail');
                    router.push('/connexion');
                  }
                } catch (error) {
                  // On error, redirect to login
                  sessionStorage.removeItem('pendingVerificationEmail');
                  router.push('/connexion');
                }
              } else {
                // No valid token, redirect to login page
                sessionStorage.removeItem('pendingVerificationEmail');
                router.push('/connexion');
              }
            }
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    const handleVerified = async () => {
      sessionStorage.removeItem('pendingVerificationEmail');
      setShowWelcome(true);
      setRedirecting(true);
      
      // Determine redirect path based on user role
      let redirectPath = '/dashboard';
      try {
        if (session?.user?.id) {
          const response = await fetch(`/api/users/${session.user.id}`);
          const user = await response.json();
          if (user?.role === 'school_manager') {
            redirectPath = '/dashboard-manager';
          }
        } else if (userEmail) {
          // Check user by email if not logged in yet
          const response = await fetch('/api/get-user-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
          if (response.ok) {
            const data = await response.json();
            if (data?.user?.role === 'school_manager') {
              redirectPath = '/dashboard-manager';
            }
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        // Default to student dashboard on error
      }
      
      // Show welcome for 3 seconds then redirect
      setTimeout(() => {
        router.push(redirectPath);
      }, 3000);
    };

    // Check immediately and then every 3 seconds
    checkVerification();
    const interval = setInterval(checkVerification, 3000);

    return () => clearInterval(interval);
  }, [session, status, router, userEmail]);

  if (showWelcome) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
          <div className="mb-6 animate-bounce">
            <svg className="w-24 h-24 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4 animate-fade-in-delay">
            Bienvenue ! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-6 animate-fade-in-delay-2">
            Votre email a été vérifié avec succès !
          </p>
          {redirecting && (
            <div className="flex items-center justify-center gap-2 text-blue-600 animate-fade-in-delay-3">
              <div className="animate-spin">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="text-sm font-medium">Redirection vers votre tableau de bord...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
        {/* Animated Email Icon */}
        <div className="mb-8 animate-fade-in">
          <div className="relative inline-block">
            <svg className="w-32 h-32 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="absolute top-0 right-0 flex items-center justify-center w-12 h-12 bg-green-500 rounded-full animate-pulse">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4 animate-fade-in-delay">
          Vérification de votre e-mail
        </h1>

        {/* Main Message */}
        <p className="text-lg text-gray-600 mb-6 animate-fade-in-delay-2">
          Merci de vous être inscrit ! Un e-mail de vérification a été envoyé à votre adresse e-mail.
        </p>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6 animate-fade-in-delay-3">
          <p className="text-gray-700 mb-3">
            📧 Vérifiez votre boîte de réception et cliquez sur le lien de vérification pour activer votre compte.
          </p>
          {userEmail && (
            <p className="text-sm text-gray-600 font-medium">
              Email : {userEmail}
            </p>
          )}
        </div>

        {/* Link */}
        <p className="text-sm text-gray-500 mb-6">
          Pas reçu l'e-mail ?{' '}
          <Link className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors" href="/resend-verification">
            Renvoyer l'e-mail de vérification
          </Link>
        </p>

        {/* Status Indicator */}
        {userEmail && (
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 animate-fade-in-delay-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Vérification automatique en cours...</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.6s ease-out 0.1s backwards;
        }
        
        .animate-fade-in-delay-2 {
          animation: fade-in 0.6s ease-out 0.2s backwards;
        }
        
        .animate-fade-in-delay-3 {
          animation: fade-in 0.6s ease-out 0.3s backwards;
        }
        
        .animate-fade-in-delay-4 {
          animation: fade-in 0.6s ease-out 0.4s backwards;
        }
      `}</style>
    </div>
  );
};

export default EmailVerification;
