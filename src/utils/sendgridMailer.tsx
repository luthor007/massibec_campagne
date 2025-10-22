// src/utils/sendgridMailer.tsx
import sgMail from '@sendgrid/mail';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Interfaces
interface ProductItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  products: ProductItem[];
  deliveryDate: string;
  schoolName: string;
  studentName: string;
  studentEmail: string;
}

interface VerificationData {
  firstName: string;
  verificationUrl: string;
}

// Send verification email
export const sendVerificationEmail = async ({ to, cc, subject, firstName, verificationUrl }: {
  to: string;
  cc?: string;
  subject: string;
  firstName: string;
  verificationUrl: string;
}) => {
  try {
    const verificationData: VerificationData = {
      firstName,
      verificationUrl
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Vérification de votre compte</h2>
        <p>Bonjour ${firstName},</p>
        <p>Merci de vous être inscrit ! Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse e-mail :</p>
        <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Vérifier mon e-mail
        </a>
        <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>Ce lien expire dans 24 heures.</p>
        <p>Cordialement,<br>L'équipe Massibec</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'commande@massibec.com',
        name: 'Campagne Massibec'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de vérification envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send school confirmation email
export const sendSchoolConfirmationEmail = async ({ to, cc, subject, schoolName, managerName }: {
  to: string;
  cc?: string;
  subject: string;
  schoolName: string;
  managerName: string;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Confirmation d'inscription - ${schoolName}</h2>
        <p>Bonjour ${managerName},</p>
        <p>Votre inscription pour l'école <strong>${schoolName}</strong> a été confirmée avec succès !</p>
        <p>Vous pouvez maintenant accéder à votre tableau de bord pour créer votre première campagne.</p>
        <p>Cordialement,<br>L'équipe Massibec</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'commande@massibec.com',
        name: 'Campagne Massibec'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation école envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send student confirmation email
export const sendStudentConfirmationEmail = async ({ to, cc, subject, studentName, schoolName }: {
  to: string;
  cc?: string;
  subject: string;
  studentName: string;
  schoolName: string;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Confirmation d'inscription - ${schoolName}</h2>
        <p>Bonjour ${studentName},</p>
        <p>Votre inscription pour l'école <strong>${schoolName}</strong> a été confirmée avec succès !</p>
        <p>Vous pouvez maintenant commencer à vendre des produits.</p>
        <p>Cordialement,<br>L'équipe Massibec</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'commande@massibec.com',
        name: 'Campagne Massibec'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation étudiant envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async ({ to, cc, subject, orderData }: {
  to: string;
  cc?: string;
  subject: string;
  orderData: OrderData;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Confirmation de commande #${orderData.orderNumber}</h2>
        <p>Bonjour ${orderData.customerName},</p>
        <p>Votre commande a été confirmée avec succès !</p>
        <h3>Détails de la commande :</h3>
        <ul>
          ${orderData.products.map(product => `<li>${product.name} x${product.quantity} - $${product.price}</li>`).join('')}
        </ul>
        <p><strong>Total : $${orderData.totalAmount}</strong></p>
        <p><strong>Date de livraison : ${orderData.deliveryDate}</strong></p>
        <p>Cordialement,<br>L'équipe Massibec</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'commande@massibec.com',
        name: 'Campagne Massibec'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation commande envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send Massibec confirmation email
export const sendMassibecConfirmationEmail = async ({ to, cc, subject, orderData }: {
  to: string;
  cc?: string;
  subject: string;
  orderData: OrderData;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Nouvelle commande #${orderData.orderNumber}</h2>
        <p>Une nouvelle commande a été passée :</p>
        <h3>Informations client :</h3>
        <p>Nom : ${orderData.customerName}</p>
        <p>Email : ${orderData.customerEmail}</p>
        <h3>Détails de la commande :</h3>
        <ul>
          ${orderData.products.map(product => `<li>${product.name} x${product.quantity} - $${product.price}</li>`).join('')}
        </ul>
        <p><strong>Total : $${orderData.totalAmount}</strong></p>
        <p><strong>Date de livraison : ${orderData.deliveryDate}</strong></p>
        <p><strong>École : ${orderData.schoolName}</strong></p>
        <p><strong>Étudiant : ${orderData.studentName} (${orderData.studentEmail})</strong></p>
        <p>Cordialement,<br>Système Massibec</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'commande@massibec.com',
        name: 'Campagne Massibec'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation Massibec envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};