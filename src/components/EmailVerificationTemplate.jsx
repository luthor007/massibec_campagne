// src/components/EmailVerificationTemplate.jsx

import React from 'react';

const EmailVerificationTemplate = ({ firstName, verificationUrl }) => {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Bonjour {firstName},</h2>
      <p>Merci de vous être inscrit sur notre plateforme !</p>
      <p>Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
      <a href={verificationUrl} style={styles.button}>
        Vérifier mon e-mail
      </a>
      <p>Ce lien expirera dans 24 heures.</p>
      <p>Si vous n'avez pas créé de compte, veuillez ignorer cet e-mail.</p>
      <p>Cordialement,<br/>L'équipe de Support</p>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    color: '#333',
    backgroundColor: '#fff',
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    borderRadius: '8px',
  },
  heading: {
    color: '#4A90E2',
  },
  button: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#4A90E2',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '4px',
    margin: '20px 0',
  },
};

export default EmailVerificationTemplate;