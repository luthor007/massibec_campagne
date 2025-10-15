// src/pages/api/send-email-campaign.js
import dbConnect from '../../lib/mongodb';
import Client from '../../models/Client';
import Store from '../../models/Store';
import { getToken } from 'next-auth/jwt';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      
      // Récupérer les informations de la boutique
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ message: 'Boutique non trouvée' });
      }

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
          const storeUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/boutique/${storeId}`;
          let personalizedTemplate = template
            .replace(/{nom}/g, client.name)
            .replace(/{boutique}/g, store.name || 'Ma Boutique')
            .replace(/{lien}/g, storeUrl);
          
          let personalizedSubject = subject
            .replace(/{nom}/g, client.name)
            .replace(/{boutique}/g, store.name || 'Ma Boutique');

          // Créer le HTML de l'email
          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                  }
                  .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                  }
                  .content {
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                  }
                  .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                  }
                  .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 12px;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>🍰 ${store.name || 'Ma Boutique'}</h1>
                  <p>Campagne de financement Massibec</p>
                </div>
                <div class="content">
                  ${personalizedTemplate.replace(/\n/g, '<br>')}
                  
                  <div style="text-align: center;">
                    <a href="${storeUrl}" class="button">
                      Voir la boutique
                    </a>
                  </div>
                </div>
                <div class="footer">
                  <p>Merci de votre soutien! 💙</p>
                  <p>Cet email a été envoyé par ${store.name || 'Ma Boutique'}</p>
                </div>
              </body>
            </html>
          `;
          
          // Envoyer l'email via Resend
          const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: client.email,
            subject: personalizedSubject,
            html: htmlContent,
            text: personalizedTemplate
          });

          if (error) {
            console.error('Resend error for', client.email, ':', error);
            emailsFailed.push({
              clientId: client._id,
              clientName: client.name,
              email: client.email,
              error: error.message
            });
          } else {
            emailsSent.push({
              clientId: client._id,
              clientName: client.name,
              email: client.email,
              messageId: data?.id,
              sent: true
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
