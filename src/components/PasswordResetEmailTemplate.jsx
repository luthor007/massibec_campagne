// components/PasswordResetEmailTemplate.jsx

import React from 'react';

const PasswordResetEmailTemplate = ({ resetLink }) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      <h2>Bonjour,</h2>
      <p>
        Vous avez demandé une réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour définir un nouveau mot de passe :
      </p>
      <p>
        <a href={resetLink} style={{ color: '#1a73e8', textDecoration: 'none' }}>
          Réinitialiser le mot de passe
        </a>
      </p>
      <p>
        Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
      </p>
      <p>Cordialement,<br />Votre équipe</p>
    </div>
  );
};

export default PasswordResetEmailTemplate;