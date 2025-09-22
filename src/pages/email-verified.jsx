// src/pages/email-verified.jsx

import React from 'react';
import Link from 'next/link';

const EmailVerified = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>E-mail vérifié avec succès !</h1>
      <p>Votre adresse e-mail a été vérifiée. Vous pouvez maintenant vous connecter à votre compte.</p>
      <Link href="/connexion" style={styles.button}>Se connecter</Link>
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
    color: '#4A90E2',
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
};

export default EmailVerified;