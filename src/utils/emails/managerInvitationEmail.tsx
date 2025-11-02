// src/utils/emails/managerInvitationEmail.tsx
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ManagerInvitationData {
  schoolName: string;
  inviterName: string;
  role: string;
  invitationUrl: string;
  expiresIn: string;
}

const ManagerInvitationEmailTemplate = ({ 
  schoolName, 
  inviterName, 
  role, 
  invitationUrl, 
  expiresIn 
}: ManagerInvitationData) => {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '600px', 
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src="/images/logo_massibec.png" 
            alt="Massibec" 
            style={{ height: '60px', marginBottom: '20px' }}
          />
          <h1 style={{ 
            color: '#2563eb', 
            fontSize: '24px', 
            margin: '0',
            fontWeight: 'bold'
          }}>
            Invitation à gérer {schoolName}
          </h1>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '30px' }}>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#374151',
            marginBottom: '20px'
          }}>
            Bonjour,
          </p>
          
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#374151',
            marginBottom: '20px'
          }}>
            <strong>{inviterName}</strong> vous invite à devenir <strong>{role}</strong> pour l'école <strong>{schoolName}</strong> sur la plateforme Massibec.
          </p>

          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#374151',
            marginBottom: '20px'
          }}>
            En acceptant cette invitation, vous pourrez :
          </p>

          <ul style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#374151',
            marginBottom: '20px',
            paddingLeft: '20px'
          }}>
            <li>Gérer les campagnes de financement</li>
            <li>Suivre les participants et leurs ventes</li>
            <li>Consulter les rapports et statistiques</li>
            {role === 'Administrateur' && (
              <li>Inviter d'autres gestionnaires</li>
            )}
          </ul>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <a 
            href={invitationUrl}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 30px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
          >
            Accepter l'invitation
          </a>
        </div>

        {/* Expiry Notice */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#92400e',
            margin: '0',
            textAlign: 'center'
          }}>
            ⏰ Cette invitation expire dans {expiresIn}
          </p>
        </div>

        {/* Footer */}
        <div style={{ 
          borderTop: '1px solid #e5e7eb', 
          paddingTop: '20px',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: '0'
          }}>
            Si vous ne souhaitez pas accepter cette invitation, vous pouvez ignorer cet email.
          </p>
          
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: '10px 0 0 0'
          }}>
            Questions ? Contactez-nous à <a href="mailto:commande@massibec.com" style={{ color: '#2563eb' }}>commande@massibec.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export const sendManagerInvitationEmail = async ({
  to,
  schoolName,
  inviterName,
  role,
  invitationUrl,
  expiresIn
}: {
  to: string;
  schoolName: string;
  inviterName: string;
  role: string;
  invitationUrl: string;
  expiresIn: string;
}) => {
  try {
    const emailHtml = ReactDOMServer.renderToString(
      ManagerInvitationEmailTemplate({
        schoolName,
        inviterName,
        role,
        invitationUrl,
        expiresIn
      })
    );

    const msg = {
      to,
      from: {
        email: 'commande@massibec.com',
        name: 'Massibec'
      },
      subject: `Invitation à gérer ${schoolName} - Massibec`,
      html: emailHtml,
    };

    await sgMail.send(msg);
    console.log('Manager invitation email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending manager invitation email:', error);
    throw error;
  }
};
