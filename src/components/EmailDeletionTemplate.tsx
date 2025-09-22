// components/EmailDeletionTemplate.tsx

import React from 'react';

interface EmailDeletionTemplateProps {
  firstName: string;
  storeName: string;
  orderId: string;
  deletionDate: string;
  reason: string; // Par exemple, "Non-paiement"
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
}

const EmailDeletionTemplate: React.FC<EmailDeletionTemplateProps> = ({
  firstName,
  storeName,
  orderId,
  deletionDate,
  sellerName,
  sellerPhone,
  sellerEmail,
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      
      <p>Bonjour <strong>{firstName}</strong>,</p>
      
      <p>
        Ce message est pour vous informer que votre commande numéro <strong>#{orderId}</strong> a été supprimée.
      </p>
      
      <p>
        <strong>Date de suppression :</strong> {deletionDate}
      </p>
      
      <h3>Détails de la commande</h3>
      
      <p><strong>Nom du vendeur :</strong> {sellerName}</p>
      <p><strong>Numéro de téléphone du vendeur :</strong> {sellerPhone}</p>
      <p><strong>Email du vendeur :</strong> {sellerEmail}</p>
      
      <p>
        Si vous avez des questions ou souhaitez discuter de votre commande, n'hésitez pas à nous contacter à l'adresse <strong>{sellerEmail}</strong> ou par téléphone au <strong>{sellerPhone}</strong>.
      </p>
      
      <p>
        Merci de votre compréhension.
      </p>
      
      <p>
        Cordialement,<br/>
        {storeName}
      </p>
    </div>
  );
};

export default EmailDeletionTemplate;