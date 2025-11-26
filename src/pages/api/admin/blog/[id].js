import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';
import { checkAdminAccess } from '@/lib/adminAuth';

export default async function handler(req, res) {
    try {
        await dbConnect();

        // Check admin access
        const { authorized, message } = await checkAdminAccess(req);
        if (!authorized) {
            return res.status(403).json({ message });
        }

        const { id } = req.query;

        if (req.method === 'GET') {
            const blog = await Blog.findById(id).populate('author', 'name email');
            if (!blog) {
                return res.status(404).json({ message: 'Blog post not found' });
            }
            return res.status(200).json(blog);
        }

        if (req.method === 'PUT') {
            const { title, slug, excerpt, content, featuredImage, metaTitle, metaDescription, metaKeywords, categories, tags, published } = req.body;

            const blog = await Blog.findById(id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog post not found' });
            }

            // Check if slug is being changed and if new slug already exists
            if (slug && slug !== blog.slug) {
                const existingBlog = await Blog.findOne({ slug });
                if (existingBlog) {
                    return res.status(400).json({ message: 'Slug already exists' });
                }
            }

            // Update fields
            if (title) blog.title = title;
            if (slug) blog.slug = slug;
            if (excerpt) blog.excerpt = excerpt;
            if (content !== undefined) blog.content = content;
            if (featuredImage !== undefined) blog.featuredImage = featuredImage;
            if (metaTitle !== undefined) blog.metaTitle = metaTitle;
            if (metaDescription !== undefined) blog.metaDescription = metaDescription;
            if (metaKeywords !== undefined) blog.metaKeywords = metaKeywords;
            if (categories !== undefined) blog.categories = categories;
            if (tags !== undefined) blog.tags = tags;
            if (published !== undefined) blog.published = published;

            await blog.save();
            await blog.populate('author', 'name email');

            return res.status(200).json(blog);
        }

        if (req.method === 'DELETE') {
            const blog = await Blog.findById(id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog post not found' });
            }

            await Blog.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Blog post deleted successfully' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error in blog admin API:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

