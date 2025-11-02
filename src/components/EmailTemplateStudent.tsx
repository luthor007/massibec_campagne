// components/EmailTemplate.tsx

import React from 'react';

interface EmailTemplateProps {
  firstName: string;
  customerEmail: string;
  customerPhone: string;
  studentName: string;
  schoolName?: string;
  schoolAddress?: string;
  deliveryDate?: string;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    amount: string;
  }[];
  totalAmount: number;
  tip?: number;
  autoDeposit: boolean;
  orderId: string;
  orderDate: string;
}

const EmailTemplate: React.FC<EmailTemplateProps> = ({
  firstName,
  customerEmail,
  customerPhone,
  studentName,
  schoolName,
  schoolAddress,
  deliveryDate,
  products,
  totalAmount,
  tip = 0,
  autoDeposit,
  orderId,
  orderDate,
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>

      <p>Bonjour <strong>{studentName}</strong>,</p>
      <p>Félicitations ! Vous venez de recevoir une vente. Voici les détails :</p>

      <h3 style={{ color: '#4A90E2', fontWeight: 'bold' }}>Détails de la commande :</h3>
      <p><strong>Nom du client :</strong> {firstName}</p>
      <p><strong>Email du client :</strong> {customerEmail}</p>
      <p><strong>Téléphone du client :</strong> {customerPhone}</p>
      <p><strong>Numéro de commande :</strong> #{orderId}</p>
      <p><strong>Date de la commande :</strong> {orderDate}</p>

      {schoolAddress && deliveryDate && (
        <p style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f8ff', borderLeft: '4px solid #4A90E2' }}>
          <strong>La distribution se fera à {schoolAddress} le {deliveryDate}.</strong>
        </p>
      )}

      {autoDeposit ? null : <strong>La réponse à la question de sécurité est le courriel du client.</strong>}
 
      <h3>Produits commandés :</h3>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Produit</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Quantité</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prix Unitaire</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${(item.price || 0).toFixed(2)}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${item.amount}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total des unités :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {products.reduce((acc, item) => acc + item.quantity, 0)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Nombre de caisses :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {(products.reduce((acc, item) => acc + item.quantity * 0.17, 0)).toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Pourboire :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              {tip.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total à payer :</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
              ${totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      
      <p>
      Merci pour votre engagement et continuez à vendre avec succès !
      </p>
    </div>
  );
};

export default EmailTemplate;