import dbConnect from '../../../lib/mongodb';
import Supplier from '../../../models/Supplier';
import SupplierManager from '../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'supplier') {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    // Get supplier for this user
    const supplierManager = await SupplierManager.findOne({
        user: token.sub,
        status: 'active'
    }).populate('supplier');

    if (!supplierManager || !supplierManager.supplier) {
        return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    const supplierId = supplierManager.supplier._id;

    if (req.method === 'GET') {
        try {
            const supplier = await Supplier.findById(supplierId)
                .select('name email phone address ville codePostal logo description website certifications status visibleInList pricingSettings')
                .lean();

            if (!supplier) {
                return res.status(404).json({ message: 'Fournisseur non trouvé' });
            }

            // Convert logo to URL if it's a Cloudinary public_id
            let logoUrl = supplier.logo;
            if (supplier.logo) {
                if (supplier.logo.startsWith('supplier-logos/') || supplier.logo.startsWith('http')) {
                    // If it's already a URL or Cloudinary public_id, construct URL
                    if (supplier.logo.startsWith('http')) {
                        logoUrl = supplier.logo;
                    } else {
                        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
                        logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${supplier.logo}.png`;
                    }
                } else if (supplier.logo.startsWith('/uploads')) {
                    // Local file path
                    logoUrl = supplier.logo;
                }
            }

            res.status(200).json({
                supplier: {
                    _id: supplier._id.toString(),
                    name: supplier.name,
                    email: supplier.email, // Personal email (for account/login)
                    companyEmail: supplier.companyEmail || supplier.email, // Company email (shown to schools)
                    phone: supplier.phone,
                    address: supplier.address,
                    ville: supplier.ville,
                    codePostal: supplier.codePostal,
                    logo: supplier.logo,
                    logoUrl: logoUrl,
                    description: supplier.description,
                    website: supplier.website,
                    certifications: supplier.certifications || [],
                    status: supplier.status,
                    visibleInList: supplier.visibleInList || false,
                    pricingSettings: supplier.pricingSettings || {
                        markup: 5,
                        handlesShipping: false
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching supplier info:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des informations' });
        }
    } else if (req.method === 'PUT') {
        try {
            const {
                name,
                email,
                companyEmail,
                phone,
                address,
                ville,
                codePostal,
                description,
                website,
                certifications,
                visibleInList
            } = req.body;

            // Validate required fields
            if (!name || !email || !phone || !address) {
                return res.status(400).json({ message: 'Les champs nom, email, téléphone et adresse sont requis' });
            }

            // Sanitize inputs
            const sanitizeString = (str) => {
                if (!str) return '';
                return str.normalize('NFC').trim();
            };

            const updateData = {
                name: sanitizeString(name),
                email: email.toLowerCase().trim(),
                phone: sanitizeString(phone),
                address: sanitizeString(address),
                ville: sanitizeString(ville) || '',
                codePostal: sanitizeString(codePostal) || '',
                description: sanitizeString(description) || '',
                website: website ? sanitizeString(website) : '',
                certifications: Array.isArray(certifications) ? certifications.map(sanitizeString).filter(Boolean) : []
            };

            // Handle companyEmail if provided (optional)
            if (companyEmail !== undefined && companyEmail !== null) {
                if (companyEmail.trim()) {
                    const sanitizedCompanyEmail = companyEmail.toLowerCase().trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(sanitizedCompanyEmail)) {
                        return res.status(400).json({ message: 'Format d\'email entreprise invalide' });
                    }
                    updateData.companyEmail = sanitizedCompanyEmail;
                } else {
                    // If empty string, set to null to use fallback
                    updateData.companyEmail = null;
                }
            }

            // Handle visibleInList if provided
            if (visibleInList !== undefined) {
                updateData.visibleInList = Boolean(visibleInList);
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updateData.email)) {
                return res.status(400).json({ message: 'Format d\'email invalide' });
            }

            // Validate lengths
            if (updateData.name.length < 1 || updateData.name.length > 200) {
                return res.status(400).json({ message: 'Le nom doit contenir entre 1 et 200 caractères' });
            }

            if (updateData.address.length < 1 || updateData.address.length > 200) {
                return res.status(400).json({ message: 'L\'adresse doit contenir entre 1 et 200 caractères' });
            }

            if (updateData.description && updateData.description.length > 1000) {
                return res.status(400).json({ message: 'La description ne doit pas dépasser 1000 caractères' });
            }

            // Check if email is already used by another supplier
            const existingSupplier = await Supplier.findOne({
                email: updateData.email,
                _id: { $ne: supplierId }
            });

            if (existingSupplier) {
                return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre fournisseur' });
            }

            // Check if name is already used by another supplier
            const existingSupplierByName = await Supplier.findOne({
                name: updateData.name,
                _id: { $ne: supplierId }
            });

            if (existingSupplierByName) {
                return res.status(400).json({ message: 'Ce nom est déjà utilisé par un autre fournisseur' });
            }

            // Update supplier
            const updatedSupplier = await Supplier.findByIdAndUpdate(
                supplierId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('name email companyEmail phone address ville codePostal logo description website certifications status visibleInList').lean();

            if (!updatedSupplier) {
                return res.status(404).json({ message: 'Fournisseur non trouvé' });
            }

            res.status(200).json({
                message: 'Informations mises à jour avec succès',
                supplier: {
                    _id: updatedSupplier._id.toString(),
                    name: updatedSupplier.name,
                    email: updatedSupplier.email, // Personal email
                    companyEmail: updatedSupplier.companyEmail || updatedSupplier.email, // Company email
                    phone: updatedSupplier.phone,
                    address: updatedSupplier.address,
                    ville: updatedSupplier.ville,
                    codePostal: updatedSupplier.codePostal,
                    logo: updatedSupplier.logo,
                    description: updatedSupplier.description,
                    website: updatedSupplier.website,
                    certifications: updatedSupplier.certifications || [],
                    status: updatedSupplier.status,
                    visibleInList: updatedSupplier.visibleInList || false
                }
            });
        } catch (error) {
            console.error('Error updating supplier info:', error);

            // Handle validation errors
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({ message: messages.join(', ') });
            }

            // Handle duplicate key errors
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                return res.status(400).json({ message: `Ce ${field === 'email' ? 'email' : 'nom'} est déjà utilisé` });
            }

            res.status(500).json({ message: 'Erreur lors de la mise à jour des informations' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ message: 'Méthode non autorisée' });
    }
}

