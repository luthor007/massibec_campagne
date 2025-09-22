import React from 'react';
import Link from 'next/link';

const EmailVerification = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Vérification de votre e-mail</h1>
      <p>
        Merci de vous être inscrit ! Un e-mail de vérification a été envoyé à votre adresse e-mail.
        Veuillez vérifier votre boîte de réception et cliquer sur le lien de vérification pour activer votre compte.
      </p>
      <p>
        Si vous n'avez pas reçu l'e-mail, veuillez vérifier votre dossier de spam ou <Link className="text-blue-500" href="/resend-verification">renvoyer l'e-mail de vérification</Link>.
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
    color: '#4A90E2',
  },
};

export default EmailVerification; 