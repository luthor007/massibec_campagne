import React from 'react';
import Link from 'next/link';

const EmailVerificationError = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Erreur de vérification</h1>
      <p>
        Le lien de vérification est invalide ou a expiré. 
        Veuillez demander un nouveau lien de vérification.
      </p>
      <p>
        <Link href="/resend-verification" style={styles.button}>
          Renvoyer l'e-mail de vérification
        </Link>
      </p>
      <p>
        <Link href="/connexion" style={styles.link}>
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    padding: '50px',
  },
  heading: {
    color: '#e74c3c',
  },
  button: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#4A90E2',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '4px',
  },
  link: {
    color: '#4A90E2',
    textDecoration: 'none',
  },
};

export default EmailVerificationError;











