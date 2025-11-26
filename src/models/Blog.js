import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    excerpt: {
        type: String,
        required: true,
        maxlength: 500 // Increased from 300 to allow longer excerpts
    },
    content: {
        type: String,
        required: true
    },
    featuredImage: {
        type: String, // URL to image
        default: null
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    published: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date,
        default: null
    },
    // SEO fields
    metaTitle: {
        type: String,
        maxlength: 100 // Increased from 60 to allow longer titles
    },
    metaDescription: {
        type: String,
        maxlength: 160
    },
    metaKeywords: {
        type: [String],
        default: []
    },
    // Categories and tags
    categories: [{
        type: String,
        trim: true
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    // Analytics
    views: {
        type: Number,
        default: 0
    },
    // Reading time estimate (in minutes)
    readingTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better performance
// Note: slug index is automatically created by unique: true, so we don't need to add it here
BlogSchema.index({ published: 1, publishedAt: -1 });
BlogSchema.index({ author: 1 });
BlogSchema.index({ categories: 1 });
BlogSchema.index({ tags: 1 });

// Calculate reading time before saving
BlogSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        // Average reading speed: 200 words per minute
        const wordCount = this.content.split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / 200);
    }
    next();
});

// Auto-set publishedAt when published is set to true
BlogSchema.pre('save', function (next) {
    if (this.isModified('published') && this.published && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    if (this.isModified('published') && !this.published) {
        this.publishedAt = null;
    }
    next();
});

// Auto-truncate metaTitle, metaDescription, and excerpt if they exceed maxlength
// This runs before validation, so it prevents validation errors
BlogSchema.pre('validate', function (next) {
    // Get maxlength from schema
    const metaTitleMaxLength = this.schema.path('metaTitle').options.maxlength || 100;
    const metaDescriptionMaxLength = this.schema.path('metaDescription').options.maxlength || 160;
    const excerptMaxLength = this.schema.path('excerpt').options.maxlength || 500;

    if (this.metaTitle && this.metaTitle.length > metaTitleMaxLength) {
        this.metaTitle = this.metaTitle.substring(0, metaTitleMaxLength);
    }
    if (this.metaDescription && this.metaDescription.length > metaDescriptionMaxLength) {
        this.metaDescription = this.metaDescription.substring(0, metaDescriptionMaxLength);
    }
    if (this.excerpt && this.excerpt.length > excerptMaxLength) {
        this.excerpt = this.excerpt.substring(0, excerptMaxLength);
    }
    next();
});

// Pre-save hook to sanitize string fields to ensure valid UTF-8
BlogSchema.pre('save', function (next) {
    const stringFields = [
        'title', 'slug', 'excerpt', 'content', 'featuredImage',
        'metaTitle', 'metaDescription'
    ];

    // Sanitize top-level string fields
    for (const field of stringFields) {
        if (this[field] && typeof this[field] === 'string') {
            try {
                this[field] = Buffer.from(this[field], 'utf8').toString('utf8');
            } catch (e) {
                console.error(`Error encoding Blog.${field}:`, e);
                this[field] = '';
            }
        }
    }

    // Sanitize categories array
    if (this.categories && Array.isArray(this.categories)) {
        for (let i = 0; i < this.categories.length; i++) {
            if (this.categories[i] && typeof this.categories[i] === 'string') {
                try {
                    this.categories[i] = Buffer.from(this.categories[i], 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Blog.categories[${i}]:`, e);
                    this.categories[i] = '';
                }
            }
        }
    }

    // Sanitize tags array
    if (this.tags && Array.isArray(this.tags)) {
        for (let i = 0; i < this.tags.length; i++) {
            if (this.tags[i] && typeof this.tags[i] === 'string') {
                try {
                    this.tags[i] = Buffer.from(this.tags[i], 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Blog.tags[${i}]:`, e);
                    this.tags[i] = '';
                }
            }
        }
    }

    // Sanitize metaKeywords array
    if (this.metaKeywords && Array.isArray(this.metaKeywords)) {
        for (let i = 0; i < this.metaKeywords.length; i++) {
            if (this.metaKeywords[i] && typeof this.metaKeywords[i] === 'string') {
                try {
                    this.metaKeywords[i] = Buffer.from(this.metaKeywords[i], 'utf8').toString('utf8');
                } catch (e) {
                    console.error(`Error encoding Blog.metaKeywords[${i}]:`, e);
                    this.metaKeywords[i] = '';
                }
            }
        }
    }

    next();
});

// Clear cached model if it exists to ensure schema changes are applied
if (mongoose.models.Blog) {
    delete mongoose.models.Blog;
}

export default mongoose.model('Blog', BlogSchema);

