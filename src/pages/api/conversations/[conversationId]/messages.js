import dbConnect from '../../../../lib/mongodb';
import Conversation from '../../../../models/Conversation';
import Message from '../../../../models/Message';
import SupplierManager from '../../../../models/SupplierManager';
import SchoolManager from '../../../../models/SchoolManager';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
    await dbConnect();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return res.status(401).json({ message: 'Non autorisé' });
    }

    const userId = token.sub;
    const userRole = token.role;
    const { conversationId } = req.query;

    try {
        // Verify user has access to this conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation non trouvée' });
        }

        let hasAccess = false;
        if (userRole === 'school_manager') {
            const schoolManager = await SchoolManager.findOne({
                user: userId,
                school: conversation.school,
                status: 'active'
            });
            hasAccess = !!schoolManager;
        } else if (userRole === 'supplier') {
            const supplierManager = await SupplierManager.findOne({
                user: userId,
                status: 'active'
            }).populate('supplier');
            hasAccess = supplierManager && supplierManager.supplier._id.toString() === conversation.supplier.toString();
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Accès non autorisé à cette conversation' });
        }

        if (req.method === 'GET') {
            // Get all messages for this conversation
            const messages = await Message.find({ conversation: conversationId })
                .populate('sender', 'name email')
                .sort({ createdAt: 1 })
                .lean();

            // Mark messages as read
            const senderType = userRole === 'school_manager' ? 'school' : 'supplier';
            await Message.updateMany(
                {
                    conversation: conversationId,
                    senderType: senderType === 'school' ? 'supplier' : 'school',
                    read: false
                },
                {
                    $set: { read: true, readAt: new Date() }
                }
            );

            // Update unread counts
            if (userRole === 'school_manager') {
                conversation.unreadCountSchool = 0;
            } else {
                conversation.unreadCountSupplier = 0;
            }
            await conversation.save();

            res.status(200).json({ messages });
        } else if (req.method === 'POST') {
            // Send a new message
            const { content, attachments } = req.body;

            if (!content || content.trim().length === 0) {
                return res.status(400).json({ message: 'Le contenu du message est requis' });
            }

            const senderType = userRole === 'school_manager' ? 'school' : 'supplier';

            // Create message
            const message = new Message({
                conversation: conversationId,
                sender: userId,
                senderType,
                content: content.trim(),
                attachments: attachments || [],
                read: false
            });
            await message.save();

            // Update conversation
            conversation.lastMessage = message._id;
            conversation.lastMessageAt = new Date();

            // Update unread counts
            if (senderType === 'school') {
                conversation.unreadCountSupplier += 1;
            } else {
                conversation.unreadCountSchool += 1;
            }
            await conversation.save();

            // Populate and return
            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'name email')
                .lean();

            res.status(201).json({ message: populatedMessage });
        } else {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).json({ message: 'Méthode non autorisée' });
        }
    } catch (error) {
        console.error('Error in messages API:', error);
        res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
    }
}


