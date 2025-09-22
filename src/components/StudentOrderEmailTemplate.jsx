// components/StudentOrderEmailTemplate.jsx

import React from 'react';

const StudentOrderEmailTemplate = ({
  orderId,
  studentName,
  email,
  phoneNumber,
  schoolName,
  studentPercentage,
  products,
  totalUnits,
  totalAmount,
  amountPaid,
  paymentInstructions,
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
      <h2>Confirmation de votre commande - Commande #{orderId}</h2>

      <p>Bonjour {studentName},</p>

      <p>
        Merci d'avoir passé votre commande avec <strong>Massibec</strong>. Voici les détails de votre commande :
      </p>

      <h3>Détails de la commande :</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Produit</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Quantité</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prix Unitaire</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{(product.price - (((product.price - product.cost) * studentPercentage)/100)).toFixed(3) }$</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {((product.price - (((product.price - product.cost) * studentPercentage)/100)) * product.quantity).toFixed(3)}$
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        <strong>Total des unités :</strong> {totalUnits}<br />
        <strong>Montant total :</strong> {totalAmount.toFixed(3)}$<br />
        {/*<strong>Montant payé :</strong> {amountPaid.toFixed(2)}$*/}
      </p>

      <h3>Instructions de paiement :</h3>
      <p dangerouslySetInnerHTML={{ __html: paymentInstructions }} />

      <p>
        Si vous avez des questions, n'hésitez pas à nous contacter à l'adresse suivante : <a href="mailto:facturation@massibec.com">facturation@massibec.com</a>.
      </p>


      <p>Cordialement,<br />L'équipe Massibec</p>
    </div>
  );
};

export default StudentOrderEmailTemplate;