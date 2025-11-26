import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';
import { checkAdminAccess } from '@/lib/adminAuth';

export default async function handler(req, res) {
    try {
        await dbConnect();

        // Check admin access
        const { authorized, message, user } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        if (req.method === 'GET') {
            // Get all blogs (including unpublished)
            const { page = 1, limit = 20, search } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const query = {};
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { excerpt: { $regex: search, $options: 'i' } },
                    { slug: { $regex: search, $options: 'i' } }
                ];
            }

            const blogs = await Blog.find(query)
                .populate('author', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Blog.countDocuments(query);

            return res.status(200).json({
                blogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        }

        if (req.method === 'POST') {
            // Create new blog post
            const { title, slug, excerpt, content, featuredImage, metaTitle, metaDescription, metaKeywords, categories, tags, published } = req.body;

            if (!title || !slug || !excerpt || !content) {
                return res.status(400).json({ message: 'Title, slug, excerpt, and content are required' });
            }

            // Check if slug already exists
            const existingBlog = await Blog.findOne({ slug });
            if (existingBlog) {
                return res.status(400).json({ message: 'Slug already exists' });
            }

            const blog = new Blog({
                title,
                slug,
                excerpt,
                content,
                featuredImage: featuredImage || null,
                author: user._id,
                metaTitle: metaTitle || title,
                metaDescription: metaDescription || excerpt,
                metaKeywords: metaKeywords || [],
                categories: categories || [],
                tags: tags || [],
                published: published || false
            });

            await blog.save();
            await blog.populate('author', 'name email');

            return res.status(201).json(blog);
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error in blog admin API:', error);

        // Return validation errors in a more user-friendly format
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Erreur de validation',
                error: error
            });
        }

        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

