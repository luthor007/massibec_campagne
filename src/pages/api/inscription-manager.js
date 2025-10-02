import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';
import Product from '../../models/Product';
import { sendVerificationEmail } from '../../utils/gmailMailer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // Add this import statement

// Sanitize function to handle special characters
const sanitizeString = (str) => {
  return str ? str.normalize('NFC').trim() : str;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Connect to the database
      await dbConnect();

      // Destructure and sanitize the fields from the request body
          const {
            nomComplet,
            email,
            motDePasse,
            telephone,
            organisme,
            titreOuFonction,
            ville,
            codePostal,
            emailEcole,
            telephoneEcole,
            adresse,
            objectifFinancier,
            nombreParticipants,
            debutCampagne,
            finCampagne,
            dateDeLivraison,
            momentPourJoindre,
            profitSplitType,
            studentBenefit,
            organizationBenefit,
            raffleBenefit
          } = req.body;


      // Generate a verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours

      const sanitizedName = sanitizeString(nomComplet);
      const sanitizedEmail = sanitizeString(email);
      const sanitizedSchoolManagerInfo = {
        titreOuFonction: sanitizeString(titreOuFonction),
        organisme: organisme,
        ville: sanitizeString(ville),
        objectifFinancier: sanitizeString(objectifFinancier),
        nombreParticipants: nombreParticipants,
        telephone: sanitizeString(telephone),
        debutCampagne: debutCampagne,
      };

      // Create a new School
      const initialCampaign = {
        campaignNumber: 1,
        startDate: sanitizeString(debutCampagne),
        endDate: sanitizeString(finCampagne),
        deliveryDate: sanitizeString(dateDeLivraison),
        isActive: true,
        status: 'pending_approval', // Changed to pending approval
        financialGoal: objectifFinancier,
        profitSplitType: profitSplitType || 'percentage',
        profitSplit: {
          studentBenefit: parseFloat(studentBenefit) || 85.6,
          organizationBenefit: parseFloat(organizationBenefit) || 9.4,
          raffleBenefit: parseFloat(raffleBenefit) || 5.0
        }
      };

      const newSchool = new School({
        name: sanitizeString(organisme),
        address: sanitizeString(adresse),
        email: sanitizeString(emailEcole),
        telephone: sanitizeString(telephoneEcole),
        objectifFinancier: sanitizeString(objectifFinancier),
        debutCampagne: sanitizeString(debutCampagne),
        finCampagne: sanitizeString(finCampagne),
        dateDeLivraison: sanitizeString(dateDeLivraison),
        currentCampaignNumber: 1,
        campaigns: [initialCampaign],
        approved: false
      });

      newSchool.activeCampaignId = newSchool.campaigns[0]._id;

      await newSchool.save();

      sanitizedSchoolManagerInfo.organisme = newSchool._id;

      // Hash the password
      const hashedPassword = bcrypt.hashSync(motDePasse, 10);

      // Create the new user object with sanitized data and associated school
      const newUser = new User({
        email: sanitizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        role: 'school_manager',
        schoolManagerInfo: sanitizedSchoolManagerInfo,
        verificationToken: verificationToken,
        verificationTokenExpires: verificationTokenExpires,
      });

      // Save the user in the database
      await newUser.save();

      // Create a new product for each isDefault product in my db and copy them but assign them the school that have just been created
      const defaultProducts = await Product.find({ isDefault: true });
      defaultProducts.forEach(async (product) => {
        const newProduct = new Product({
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          image: product.image,
          isDefault: false,
          school: newSchool._id,
        });
        await newProduct.save();
      });

      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${verificationToken}`;
      const emailSubject = 'Vérifiez votre adresse e-mail';
      
      await sendVerificationEmail({
        to: sanitizedEmail,
        subject: emailSubject,
        firstName: sanitizedName.split(' ')[0], // Assuming first name is the first word
        verificationUrl,
      });

      // Respond with a success message
      res.status(201).json({ message: 'School and user created successfully' });
    } catch (error) {
      // Handle any errors
      res.status(400).json({ message: error.message });
    }
  } else {
    // Handle invalid HTTP methods
    res.status(405).json({ message: 'Method not allowed' });
  }
}
