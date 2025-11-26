import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderType: {
        type: String,
        enum: ['school', 'supplier'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    // Read status
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        required: false
    },
    // Optional: attachments
    attachments: [{
        url: String,
        filename: String,
        fileType: String,
        fileSize: Number
    }]
}, {
    timestamps: true
});

// Index for efficient queries
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ read: 1, conversation: 1 });

// Pre-save hook to sanitize string fields to ensure valid UTF-8
MessageSchema.pre('save', function (next) {
    // Sanitize content
    if (this.content && typeof this.content === 'string') {
        try {
            this.content = Buffer.from(this.content, 'utf8').toString('utf8');
        } catch (e) {
            console.error(`Error encoding Message.content:`, e);
            this.content = '';
        }
    }

    // Sanitize senderType
    if (this.senderType && typeof this.senderType === 'string') {
        try {
            this.senderType = Buffer.from(this.senderType, 'utf8').toString('utf8');
        } catch (e) {
            console.error(`Error encoding Message.senderType:`, e);
            this.senderType = '';
        }
    }

    // Sanitize attachments array
    if (this.attachments && Array.isArray(this.attachments)) {
        for (const attachment of this.attachments) {
            if (attachment.url && typeof attachment.url === 'string') {
                try {
                    attachment.url = Buffer.from(attachment.url, 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Message.attachments.url:`, e);
                    attachment.url = '';
                }
            }
            if (attachment.filename && typeof attachment.filename === 'string') {
                try {
                    attachment.filename = Buffer.from(attachment.filename, 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Message.attachments.filename:`, e);
                    attachment.filename = '';
                }
            }
            if (attachment.fileType && typeof attachment.fileType === 'string') {
                try {
                    attachment.fileType = Buffer.from(attachment.fileType, 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Message.attachments.fileType:`, e);
                    attachment.fileType = '';
                }
            }
        }
    }

    next();
});

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);


