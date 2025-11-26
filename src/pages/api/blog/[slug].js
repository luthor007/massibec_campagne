import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const { slug } = req.query;

        const blog = await Blog.findOne({ slug, published: true })
            .populate('author', 'name email');

        if (!blog) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        // Increment views
        blog.views += 1;
        await blog.save();

        res.status(200).json(blog);
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ message: 'Error fetching blog post', error: error.message });
    }
}

