import dbConnect from '../../../lib/mongodb';
import Conversation from '../../../models/Conversation';
import Message from '../../../models/Message';
import School from '../../../models/School';
import Supplier from '../../../models/Supplier';
import SupplierManager from '../../../models/SupplierManager';
import SchoolManager from '../../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;
    const userRole = token.role;

    try {
        if (req.method === 'GET') {
            // Get all conversations for the current user
            let conversations = [];

            if (userRole === 'school_manager') {
                // Get school for this user
                const schoolManager = await SchoolManager.findOne({
                    user: userId,
                    status: 'active'
                }).populate('school');

                if (!schoolManager || !schoolManager.school) {
                    return res.status(404).json({ message: 'École non trouvée' });
                }

                const schoolId = schoolManager.school._id;

                conversations = await Conversation.find({
                    school: schoolId,
                    isArchived: false
                })
                    .populate('supplier', 'name logo email phone')
                    .populate('campaign', 'name campaignCode')
                    .populate('lastMessage')
                    .sort({ lastMessageAt: -1 })
                    .lean();

                // Mark conversations as read for school
                await Conversation.updateMany(
                    { school: schoolId },
                    { $set: { unreadCountSchool: 0 } }
                );
            } else if (userRole === 'supplier') {
                // Get supplier for this user
                const supplierManager = await SupplierManager.findOne({
                    user: userId,
                    status: 'active'
                }).populate('supplier');

                if (!supplierManager || !supplierManager.supplier) {
                    return res.status(404).json({ message: 'Fournisseur non trouvé' });
                }

                const supplierId = supplierManager.supplier._id;

                // Get conversations where this supplier is the supplier
                const supplierConversations = await Conversation.find({
                    supplier: supplierId,
                    isArchived: false
                })
                    .populate('school', 'name logo email')
                    .populate('campaign', 'name campaignCode')
                    .populate('lastMessage')
                    .sort({ lastMessageAt: -1 })
                    .lean();

                // Also get conversations where supplier has an auto-created school
                // (supplier chatting with themselves through their school)
                const schoolManager = await SchoolManager.findOne({
                    user: userId,
                    status: 'active'
                }).populate('school');

                let schoolConversations = [];
                if (schoolManager && schoolManager.school) {
                    const schoolId = schoolManager.school._id;
                    schoolConversations = await Conversation.find({
                        school: schoolId,
                        isArchived: false
                    })
                        .populate('supplier', 'name logo email phone')
                        .populate('campaign', 'name campaignCode')
                        .populate('lastMessage')
                        .sort({ lastMessageAt: -1 })
                        .lean();
                }

                // Combine and deduplicate conversations
                const allConversations = [...supplierConversations, ...schoolConversations];
                const uniqueConversations = allConversations.filter((conv, index, self) =>
                    index === self.findIndex(c => c._id.toString() === conv._id.toString())
                );

                conversations = uniqueConversations;

                // Mark conversations as read for supplier
                await Conversation.updateMany(
                    { supplier: supplierId },
                    { $set: { unreadCountSupplier: 0 } }
                );
            } else {
                return res.status(403).json({ message: 'Rôle non autorisé' });
            }

            res.status(200).json({ conversations });
        } else if (req.method === 'POST') {
            // Create a new conversation
            const { schoolId, supplierId, campaignId } = req.body;

            if (!schoolId || !supplierId) {
                return res.status(400).json({ message: 'schoolId et supplierId sont requis' });
            }

            // Verify user has access
            if (userRole === 'school_manager') {
                const schoolManager = await SchoolManager.findOne({
                    user: userId,
                    school: schoolId,
                    status: 'active'
                });

                if (!schoolManager) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à créer une conversation pour cette école' });
                }
            } else if (userRole === 'supplier') {
                const supplierManager = await SupplierManager.findOne({
                    user: userId,
                    status: 'active'
                }).populate('supplier');

                if (!supplierManager || !supplierManager.supplier) {
                    return res.status(403).json({ message: 'Fournisseur non trouvé' });
                }

                // Allow supplier to create conversation with their own school (auto-created school)
                const schoolManager = await SchoolManager.findOne({
                    user: userId,
                    school: schoolId,
                    status: 'active'
                });

                // Supplier can create conversation if:
                // 1. They own the supplier, OR
                // 2. They have access to the school (auto-created school)
                if (supplierManager.supplier._id.toString() !== supplierId && !schoolManager) {
                    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à créer une conversation pour ce fournisseur' });
                }
            } else {
                return res.status(403).json({ message: 'Rôle non autorisé' });
            }

            // Check if conversation already exists
            let conversation = await Conversation.findOne({
                school: schoolId,
                supplier: supplierId
            });

            if (!conversation) {
                conversation = new Conversation({
                    school: schoolId,
                    supplier: supplierId,
                    campaign: campaignId || null
                });
                await conversation.save();
            } else if (conversation.isArchived) {
                // Unarchive if it exists but is archived
                conversation.isArchived = false;
                await conversation.save();
            }

            // Populate and return
            conversation = await Conversation.findById(conversation._id)
                .populate('school', 'name logo email')
                .populate('supplier', 'name logo email phone')
                .populate('campaign', 'name campaignCode')
                .lean();

            res.status(200).json({ conversation });
        } else {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).json({ message: 'Méthode non autorisée' });
        }
    } catch (error) {
        console.error('Error in conversations API:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
}

