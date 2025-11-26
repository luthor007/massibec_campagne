// src/pages/api/send-email-campaign.js
import dbConnect from '../../lib/mongodb';
import Client from '../../models/Client';
import Store from '../../models/Store';
import User from '../../models/User';
import { getToken } from 'next-auth/jwt';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export default async function handler(req, res) {
  await dbConnect();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  if (req.method === 'POST') {
    try {
      const { clientIds, template, storeId, subject } = req.body;

      if (!clientIds || clientIds.length === 0) {
        return res.status(400).json({ message: 'Aucun client sélectionné' });
      }

      if (!template || !subject) {
        return res.status(400).json({ message: 'Le sujet et le template sont requis' });
      }

      // Récupérer les informations de la boutique avec l'utilisateur
      const store = await Store.findById(storeId).populate('user', 'email name role');
      if (!store) {
        return res.status(404).json({ message: 'Boutique non trouvée' });
      }

      // Récupérer l'utilisateur (étudiant ou school manager) qui possède le store
      const storeOwner = store.user;
      if (!storeOwner) {
        return res.status(404).json({ message: 'Propriétaire de la boutique non trouvé' });
      }

      // Utiliser l'email et le nom de l'étudiant/school manager comme expéditeur
      const senderEmail = storeOwner.email;
      const senderName = storeOwner.name || store.name || 'Jappuie.ca';

      // SendGrid permet d'utiliser le nom de l'étudiant comme expéditeur
      // avec commande@jappuie.ca comme email vérifié
      // L'email de l'étudiant sera en reply-to pour que les réponses lui arrivent directement
      const fromEmail = 'commande@jappuie.ca';
      const fromName = senderName;

      console.log('[send-email-campaign] Sending emails from:', fromName, '<' + fromEmail + '>', 'with reply-to:', senderEmail);

      // Récupérer les clients sélectionnés
      const clients = await Client.find({
        _id: { $in: clientIds },
        storeId
      });

      const emailsSent = [];
      const emailsFailed = [];

      for (const client of clients) {
        try {
          // Remplacer les variables dans le template
          // Add source=email parameter to track email campaign visits
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const storeUrl = `${baseUrl}/boutique/${storeId}?source=email`;
          let personalizedTemplate = template
            .replace(/{nom}/g, client.name)
            .replace(/{lien}/g, storeUrl);
          // Le nom de l'étudiant est déjà ajouté à la fin du template dans le composant

          let personalizedSubject = subject
            .replace(/{nom}/g, client.name);

          // Convertir les sauts de ligne en paragraphes pour un meilleur rendu
          const formattedTemplate = personalizedTemplate
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p style="margin: 0 0 16px 0; line-height: 1.7; color: #374151;">${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');

          // Créer le HTML de l'email avec un design moderne
          const htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1f2937;
                    background-color: #f3f4f6;
                    padding: 0;
                    margin: 0;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                  }
                  .email-wrapper {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06);
                  }
                  .header {
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
                    color: #ffffff;
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                  }
                  .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
                    opacity: 0.3;
                  }
                  .header-content {
                    position: relative;
                    z-index: 1;
                  }
                  .header h1 {
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  }
                  .header p {
                    font-size: 16px;
                    margin: 0;
                    opacity: 0.95;
                    font-weight: 400;
                  }
                  .content {
                    background: #ffffff;
                    padding: 40px 30px;
                    color: #374151;
                  }
                  .content p {
                    margin: 0 0 16px 0;
                    line-height: 1.7;
                    font-size: 16px;
                    color: #374151;
                  }
                  .content p:last-child {
                    margin-bottom: 0;
                  }
                  .button-container {
                    text-align: center;
                    margin: 32px 0 24px 0;
                  }
                  .button {
                    display: inline-block;
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);
                    transition: all 0.2s ease;
                    letter-spacing: 0.3px;
                  }
                  .button:hover {
                    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
                    box-shadow: 0 6px 12px rgba(37, 99, 235, 0.35);
                    transform: translateY(-1px);
                  }
                  .divider {
                    height: 1px;
                    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
                    margin: 32px 0;
                  }
                  .footer {
                    background-color: #f9fafb;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e5e7eb;
                  }
                  .footer p {
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #6b7280;
                    line-height: 1.6;
                  }
                  .footer p:last-child {
                    margin-bottom: 0;
                  }
                  .footer-signature {
                    color: #2563eb;
                    font-weight: 600;
                    margin-top: 12px;
                  }
                  .footer-note {
                    font-size: 12px;
                    color: #9ca3af;
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #e5e7eb;
                  }
                  @media only screen and (max-width: 600px) {
                    .email-wrapper {
                      border-radius: 0;
                    }
                    .header {
                      padding: 32px 24px;
                    }
                    .header h1 {
                      font-size: 24px;
                    }
                    .content {
                      padding: 32px 24px;
                    }
                    .button {
                      padding: 12px 24px;
                      font-size: 15px;
                    }
                    .footer {
                      padding: 24px;
                    }
                  }
                </style>
              </head>
              <body>
                <div style="padding: 20px 0;">
                  <div class="email-wrapper">
                    <div class="header">
                      <div class="header-content">
                        <h1>🍰 ${store.name || 'Ma Boutique'}</h1>
                        <p>Campagne de financement Jappuie.ca</p>
                      </div>
                    </div>
                    <div class="content">
                      ${formattedTemplate}
                      
                      <div class="button-container">
                        <a href="${storeUrl}" class="button" style="color: #ffffff;">
                          Voir la boutique →
                        </a>
                      </div>
                    </div>
                    <div class="divider"></div>
                    <div class="footer">
                      <p>Merci infiniment pour votre soutien!</p>
                      <p style="margin-top: 16px;">
                        <span style="color: #374151;">Cordialement,</span><br>
                        <span class="footer-signature" style="margin-top: 4px; display: inline-block;">${senderName}</span>
                      </p>
                      <p class="footer-note">
                        Vous pouvez répondre directement à cet email pour contacter ${senderName}
                      </p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          // Envoyer l'email via SendGrid avec le nom de l'étudiant comme expéditeur
          // et son email en reply-to pour que les réponses lui arrivent
          const msg = {
            from: {
              email: fromEmail,
              name: fromName
            },
            to: client.email,
            replyTo: senderEmail, // Les réponses iront directement à l'étudiant
            subject: personalizedSubject,
            html: htmlContent,
            text: personalizedTemplate
          };

          try {
            await sgMail.send(msg);
            emailsSent.push({
              clientId: client._id,
              clientName: client.name,
              email: client.email,
              sent: true
            });
            console.log(`[send-email-campaign] Email sent to ${client.email} via SendGrid`);
          } catch (sgError) {
            console.error('SendGrid error for', client.email, ':', sgError);
            const errorMessage = sgError?.response?.body?.errors?.[0]?.message || sgError?.message || 'Erreur SendGrid';
            emailsFailed.push({
              clientId: client._id,
              clientName: client.name,
              email: client.email,
              error: errorMessage
            });
          }
        } catch (clientError) {
          console.error('Error sending to', client.email, ':', clientError);
          emailsFailed.push({
            clientId: client._id,
            clientName: client.name,
            email: client.email,
            error: clientError.message
          });
        }
      }

      res.status(200).json({
        message: `${emailsSent.length} email(s) envoyé(s) avec succès${emailsFailed.length > 0 ? `, ${emailsFailed.length} échec(s)` : ''}`,
        emailsSent,
        emailsFailed
      });
    } catch (error) {
      console.error('Error sending email campaign:', error);
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }
}
