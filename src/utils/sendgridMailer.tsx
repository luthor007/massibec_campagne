// src/utils/sendgridMailer.tsx
import sgMail from '@sendgrid/mail';
import { SendEmailParams, ProductItemEmail } from './emailTypes';
import ReactDOMServer from 'react-dom/server';
import StudentOrderEmailTemplate from '../components/StudentOrderEmailTemplate';
import EmailTemplateStudent from '../components/EmailTemplateStudent';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Interfaces
interface LegacyProductItem {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
  cost?: number;
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  products: LegacyProductItem[];
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
        <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: 'Jappuie.ca'
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
        <h2 style="color: #2563eb;">Confirmation d'inscription de l'école</h2>
        <p>Bonjour ${managerName},</p>
        <p>Votre inscription pour l'école <strong>${schoolName}</strong> a été confirmée avec succès !</p>
        <p>Vous pouvez maintenant accéder à votre tableau de bord pour créer votre première campagne.</p>
        <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: 'Jappuie'
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
export const sendStudentConfirmationEmail = async ({ to, cc, subject, studentName, schoolName, managerEmail }: {
  to: string;
  cc?: string;
  subject: string;
  studentName: string;
  schoolName: string;
  managerEmail?: string;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Confirmation d'inscription du vendeur (étudiant)</h2>
        <p>Bonjour ${studentName},</p>
        <p>Votre inscription pour l'école <strong>${schoolName}</strong> a été confirmée avec succès !</p>
        <p>Vous pouvez maintenant commencer à vendre des produits.</p>
        <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: `Jappuie - ${schoolName}`
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    if (managerEmail) {
      msg.replyTo = managerEmail;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation étudiant envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async ({ to, cc, subject, orderData, sellerEmail }: {
  to: string;
  cc?: string;
  subject: string;
  orderData: OrderData;
  sellerEmail?: string;
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
        <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: `${orderData.studentName} - Campagne ${orderData.schoolName}`
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    if (sellerEmail) {
      msg.replyTo = sellerEmail;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation commande envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send Jappuie.ca confirmation email
export const sendJappuieConfirmationEmail = async ({ to, cc, subject, orderData }: {
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
        <p><strong>La distribution se fera à l'école le ${orderData.deliveryDate}.</strong></p>
        <p>Cordialement,<br>Équipe Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: 'Jappuie.ca'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de confirmation Jappuie.ca envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async ({ to, cc, subject, resetLink }: {
  to: string;
  cc?: string;
  subject: string;
  resetLink: string;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>
        <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: 'Jappuie.ca'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de réinitialisation envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send deletion email
export const sendDeletionEmail = async ({ to, cc, subject, firstName }: {
  to: string;
  cc?: string;
  subject: string;
  firstName: string;
}) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Suppression de compte</h2>
        <p>Bonjour ${firstName},</p>
        <p>Votre compte a été supprimé avec succès.</p>
        <p>Si vous souhaitez créer un nouveau compte à l'avenir, vous pouvez vous réinscrire à tout moment.</p>
        <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
      </div>
    `;

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: 'Jappuie'
      },
      to,
      subject,
      html: htmlContent,
    };

    if (cc) {
      msg.cc = cc;
    }

    await sgMail.send(msg);
    console.log(`Email de suppression envoyé à ${to} via SendGrid`);
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send student order email
type LegacyStudentOrderParams = {
  to: string;
  cc?: string;
  subject: string;
  studentName: string;
  orderData: OrderData;
};

type NewStudentOrderParams = {
  studentPercentage: number;
  orderId: string;
  studentName: string;
  email: string;
  phoneNumber: string;
  schoolName: string;
  products: ProductItemEmail[];
  totalUnits: number;
  totalAmount: number;
  amountPaid: number;
  paymentInstructions: string;
  cc?: string;
  subject?: string;
  // New profit breakdown fields
  studentCashBenefit?: number;
  studentSchoolAccountBenefit?: number;
  schoolProjectBenefit?: number;
  raffleBenefit?: number;
  tipBreakdown?: {
    studentCash: number;
    studentSchoolAccount: number;
    schoolProject: number;
  };
};

export const sendStudentOrderEmail = async (params: LegacyStudentOrderParams | NewStudentOrderParams) => {
  try {
    // Legacy shape (with orderData) vs new shape detection
    if ('orderData' in params) {
      const legacyParams = params as LegacyStudentOrderParams;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Nouvelle commande - ${legacyParams.studentName}</h2>
          <p>Bonjour ${legacyParams.studentName},</p>
          <p>Une nouvelle commande a été passée :</p>
          <h3>Détails de la commande :</h3>
          <ul>
            ${legacyParams.orderData.products.map(product => `<li>${product.name} x${product.quantity} - $${product.price}</li>`).join('')}
          </ul>
          <p><strong>Total : $${legacyParams.orderData.totalAmount}</strong></p>
          <p><strong>Date de livraison : ${legacyParams.orderData.deliveryDate}</strong></p>
          <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
        </div>
      `;

      const msg: any = {
        from: {
          email: 'team@jappuie.ca',
          name: 'Jappuie.ca'
        },
        to: legacyParams.to,
        subject: legacyParams.subject,
        html: htmlContent,
      };

      if (legacyParams.cc) {
        msg.cc = legacyParams.cc;
      }

      await sgMail.send(msg);
      console.log(`Email de commande étudiant envoyé à ${legacyParams.to} via SendGrid`);
    } else {
      const p = params as NewStudentOrderParams;

      const htmlContent = ReactDOMServer.renderToStaticMarkup(
        <StudentOrderEmailTemplate
          {...({
            studentPercentage: p.studentPercentage,
            orderId: p.orderId,
            studentName: p.studentName,
            email: p.email,
            phoneNumber: p.phoneNumber,
            schoolName: p.schoolName,
            products: p.products,
            totalUnits: p.totalUnits,
            totalAmount: p.totalAmount,
            amountPaid: p.amountPaid,
            paymentInstructions: p.paymentInstructions,
            studentCashBenefit: p.studentCashBenefit,
            studentSchoolAccountBenefit: p.studentSchoolAccountBenefit,
            schoolProjectBenefit: p.schoolProjectBenefit,
            raffleBenefit: p.raffleBenefit,
            tipBreakdown: p.tipBreakdown,
          } as any)}
        />
      );

      const msg: any = {
        from: {
          email: 'team@jappuie.ca',
          name: 'Jappuie.ca'
        },
        to: p.email,
        subject: p.subject || `Confirmation de votre commande - Commande #${p.orderId}`,
        html: htmlContent,
      };

      if (p.cc) {
        msg.cc = p.cc;
      }

      await sgMail.send(msg);
      console.log(`Email de commande étudiant envoyé à ${p.email} via SendGrid`);
    }
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Send sale notification email
export const sendSaleNotificationEmail = async (
  params:
    | { to: string; cc?: string; subject: string; saleData: any }
    | ({
      to: string;
      cc?: string;
      subject?: string;
      studentName: string;
      firstName: string;
      customerEmail: string;
      customerPhone: string;
      schoolName?: string;
      schoolAddress?: string;
      deliveryDate?: string;
      products: ProductItemEmail[];
      totalAmount: number;
      tip: number;
      autoDeposit: boolean;
      orderId: string;
      orderDate: string;
    })
) => {
  try {
    const isLegacy = (p: any): p is { to: string; cc?: string; subject: string; saleData: any } =>
      typeof p?.saleData !== 'undefined';

    if (isLegacy(params)) {
      const { to, cc, subject, saleData } = params;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Notification de vente</h2>
          <p>Une nouvelle vente a été enregistrée :</p>
          <h3>Détails de la vente :</h3>
          <p><strong>Montant : $${saleData.amount || 'N/A'}</strong></p>
          <p><strong>Date : ${saleData.date || 'N/A'}</strong></p>
          <p>Cordialement,<br>L'équipe de Jappuie.ca</p>
        </div>
      `;

      const msg: any = {
        from: {
          email: 'team@jappuie.ca',
          name: 'Jappuie.ca'
        },
        to,
        subject,
        html: htmlContent,
      };

      if (cc) {
        msg.cc = cc;
      }

      await sgMail.send(msg);
      console.log(`Email de notification de vente envoyé à ${to} via SendGrid`);
    } else {
      const {
        to,
        cc,
        subject,
        studentName,
        firstName,
        customerEmail,
        customerPhone,
        schoolName,
        schoolAddress,
        deliveryDate,
        products,
        totalAmount,
        tip,
        autoDeposit,
        orderId,
        orderDate,
      } = params as {
        to: string;
        cc?: string;
        subject?: string;
        studentName: string;
        firstName: string;
        customerEmail: string;
        customerPhone: string;
        schoolName?: string;
        schoolAddress?: string;
        deliveryDate?: string;
        products: ProductItemEmail[];
        totalAmount: number;
        tip: number;
        autoDeposit: boolean;
        orderId: string;
        orderDate: string;
      };

      const htmlContent = ReactDOMServer.renderToStaticMarkup(
        <EmailTemplateStudent
          firstName={firstName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          studentName={studentName}
          schoolName={schoolName}
          schoolAddress={schoolAddress}
          deliveryDate={deliveryDate}
          products={products}
          totalAmount={totalAmount}
          tip={tip || 0}
          autoDeposit={autoDeposit}
          orderId={orderId}
          orderDate={orderDate}
        />
      );

      const msg: any = {
        from: {
          email: 'team@jappuie.ca',
          name: 'Jappuie.ca'
        },
        to,
        subject: subject || `Nouvelle Vente Reçue - Commande #${orderId}`,
        html: htmlContent,
      };

      if (cc) {
        msg.cc = cc;
      }

      await sgMail.send(msg);
      console.log(`Email de notification de vente envoyé à ${studentName} via SendGrid`);
    }
  } catch (error) {
    console.error('Erreur SendGrid:', error);
    throw error;
  }
};

// Generic email sender
export const sendEmail = async (params: SendEmailParams) => {
  try {
    // Import React and ReactDOMServer for HTML generation
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');

    // Import the EmailTemplate component (default export)
    const EmailTemplate = require('../components/EmailTemplate').default;

    // Calculate legacy fields from campaign data if not provided
    let calculatedLegacyFields: {
      totalUnits: number;
      totalStudentBenefit: number;
      totalOrganizationBenefit: number;
      totalRaffleBenefit: number;
      studentPercentage: number;
      studentBenefit: number;
      organizationBenefit: number;
      raffleBenefit: number;
    } = {
      totalUnits: 0,
      totalStudentBenefit: 0,
      totalOrganizationBenefit: 0,
      totalRaffleBenefit: 0,
      studentPercentage: 0,
      studentBenefit: 0,
      organizationBenefit: 0,
      raffleBenefit: 0,
    };

    if (params.profitSplits && params.customPrices) {
      // Calculate totals from campaign-specific data
      const totalUnits = params.products.reduce((sum, product) => sum + product.quantity, 0);
      let totalStudentBenefit = 0;
      let totalOrganizationBenefit = 0;
      let totalRaffleBenefit = 0;

      params.products.forEach(product => {
        const customPrice = params.customPrices?.find(cp => cp.productId === product.productId);
        const profitSplit = params.profitSplits?.find(ps => ps.productId === product.productId);

        if (customPrice && profitSplit && product.cost !== undefined) {
          const productProfit = (customPrice.price - product.cost) * product.quantity;
          // Use new fields with fallback to old
          const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 0;
          const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0;
          const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0;
          const raffle = Number(profitSplit.raffle) || 0;

          // Total student benefit is cash + school account
          totalStudentBenefit += (studentCash + studentSchoolAccount) * product.quantity;
          totalOrganizationBenefit += schoolProject * product.quantity;
          totalRaffleBenefit += raffle * product.quantity;
        }
      });

      calculatedLegacyFields = {
        totalUnits,
        totalStudentBenefit,
        totalOrganizationBenefit,
        totalRaffleBenefit,
        studentPercentage: totalStudentBenefit > 0 ? (totalStudentBenefit / (totalStudentBenefit + totalOrganizationBenefit + totalRaffleBenefit)) * 100 : 0,
        studentBenefit: totalStudentBenefit,
        organizationBenefit: totalOrganizationBenefit,
        raffleBenefit: totalRaffleBenefit,
      };
    }

    // Generate HTML content using the EmailTemplate component
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      React.createElement(EmailTemplate, {
        firstName: params.firstName,
        customerEmail: params.customerEmail,
        storeName: params.storeName,
        hoursAvailable: params.hoursAvailable,
        products: params.products,
        totalAmount: params.totalAmount,
        tip: params.tip || 0,
        studentDonation: params.studentDonation || 0,
        schoolDonation: params.schoolDonation || 0,
        studentDonationSplit: params.studentDonationSplit,
        autoDeposit: params.autoDeposit,
        orderId: params.orderId,
        orderDate: params.orderDate,
        orderDeadline: params.orderDeadline,
        deliveryDate: params.deliveryDate,
        deliveryLocation: params.deliveryLocation,
        deliveryCity: params.deliveryCity,
        sellerName: params.sellerName,
        sellerEmail: params.sellerEmail,
        sellerPhone: params.sellerPhone,
        organizationType: params.organizationType,
        deliveryOption: params.deliveryOption,
        customDeliveryOption: params.customDeliveryOption,
        customerDeliveryAddress: params.customerDeliveryAddress,
        // Use calculated legacy fields or provided ones
        studentPercentage: calculatedLegacyFields.studentPercentage || params.studentPercentage || 0,
        studentBenefit: calculatedLegacyFields.studentBenefit || params.studentBenefit || 0,
        organizationBenefit: calculatedLegacyFields.organizationBenefit || params.organizationBenefit || 0,
        raffleBenefit: calculatedLegacyFields.raffleBenefit || params.raffleBenefit || 0,
        totalUnits: calculatedLegacyFields.totalUnits || params.totalUnits || 0,
        totalStudentBenefit: calculatedLegacyFields.totalStudentBenefit || params.totalStudentBenefit || 0,
        totalOrganizationBenefit: calculatedLegacyFields.totalOrganizationBenefit || params.totalOrganizationBenefit || 0,
        totalRaffleBenefit: calculatedLegacyFields.totalRaffleBenefit || params.totalRaffleBenefit || 0,
      })
    );

    const msg: any = {
      from: {
        email: 'team@jappuie.ca',
        name: 'Jappuie.ca'
      },
      to: params.to,
      subject: params.subject,
      html: htmlContent,
    };

    if (params.cc) {
      msg.cc = params.cc;
    }

    await sgMail.send(msg);
    console.log(`Email générique envoyé à ${params.to} via SendGrid`);
  } catch (error: any) {
    console.error('Erreur SendGrid:', error);
    // Log detailed error information for debugging
    if (error.response?.body?.errors) {
      console.error('Détails de l\'erreur SendGrid:', JSON.stringify(error.response.body.errors, null, 2));
    }
    if (error.response?.body) {
      console.error('Réponse complète SendGrid:', JSON.stringify(error.response.body, null, 2));
    }
    throw error;
  }
};