import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../utils/gmailMailer';

// Helper function to sanitize strings
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            await dbConnect();

            // Extract fields from req.body
            const {
                nomComplet,
                email,
                motDePasse,
                confirmationMotDePasse,
                nomEntreprise,
                telephone,
                adresse,
                ville,
                codePostal
            } = req.body;

            // Validate required fields
            if (!nomComplet || !email || !motDePasse || !confirmationMotDePasse ||
                !telephone || !adresse) {
                return res.status(400).json({
                    message: 'Tous les champs requis doivent être remplis'
                });
            }

            // Validate password confirmation
            if (motDePasse !== confirmationMotDePasse) {
                return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
            }

            if (motDePasse.length < 6) {
                return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
            }

            // Sanitize inputs
            const sanitizedName = sanitizeString(nomComplet);
            const sanitizedEmail = email ? email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
            const sanitizedNomEntreprise = nomEntreprise ? sanitizeString(nomEntreprise) : '';
            const sanitizedTelephone = sanitizeString(telephone);
            const sanitizedAdresse = sanitizeString(adresse);
            const sanitizedVille = ville ? sanitizeString(ville) : '';
            const sanitizedCodePostal = codePostal ? sanitizeString(codePostal) : '';

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedEmail)) {
                return res.status(400).json({ message: 'Format d\'email invalide.' });
            }

            // Check if email already exists
            const existingUser = await User.findOne({ email: sanitizedEmail });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Cette adresse e-mail est déjà utilisée.',
                    code: 'EMAIL_EXISTS'
                });
            }

            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationTokenExpires = new Date();
            verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

            // Hash the password
            const hashedPassword = bcrypt.hashSync(motDePasse, 10);

            // Create the user with distributor role
            const newUser = new User({
                email: sanitizedEmail,
                password: hashedPassword,
                name: sanitizedName,
                role: 'distributor',
                // Store distributor-specific info in a flexible way
                // We can create a Distributor model later if needed
                distributorInfo: {
                    nomEntreprise: sanitizedNomEntreprise || '',
                    telephone: sanitizedTelephone,
                    adresse: sanitizedAdresse,
                    ville: sanitizedVille,
                    codePostal: sanitizedCodePostal
                },
                verificationToken: verificationToken,
                verificationTokenExpires: verificationTokenExpires,
                emailVerified: false,
                profileCompleted: false
            });

            await newUser.save();

            // Send verification email
            try {
                const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
                await sendVerificationEmail({
                    to: sanitizedEmail,
                    subject: 'Vérification de votre compte Jappuie - Distributeur',
                    firstName: sanitizedName.split(' ')[0] || sanitizedName,
                    verificationUrl: verificationUrl
                });
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
                // Don't fail registration if email fails
            }

            return res.status(200).json({
                message: 'Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.',
                userId: newUser._id
            });

        } catch (error) {
            console.error('Error in inscription-distributor:', error);
            return res.status(500).json({
                message: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method not allowed' });
    }
}

