// src/pages/resend-verification.jsx

import React, { useState } from 'react';
import Link from 'next/link';

const ResendVerification = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleResend = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.message || 'Une erreur est survenue.');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de renvoi de vérification:', error);
      setMessage('Une erreur est survenue.');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Renouveler la Vérification de votre E-mail</h1>
      <form onSubmit={handleResend} style={styles.form}>
        <label htmlFor="email" style={styles.label}>Adresse E-mail:</label>
        <input
          type="email"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          placeholder="votre.email@example.com"
        />
        <button type="submit" style={styles.button}>Renouveler la Vérification</button>
      </form>
      {message && <p style={styles.message}>{message}</p>}
      <div style={styles.loginLink}>
        <Link href="/connexion" style={styles.link}>
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '400px',
    margin: '50px auto',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    textAlign: 'center',
  },
  heading: {
    color: '#4A90E2',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px',
  },
  label: {
    textAlign: 'left',
    fontWeight: 'bold',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px',
    backgroundColor: '#4A90E2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  message: {
    marginTop: '20px',
    color: 'green',
  },
  loginLink: {
    marginTop: '20px',
    textAlign: 'center',
  },
  link: {
    color: '#4A90E2',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

export default ResendVerification;