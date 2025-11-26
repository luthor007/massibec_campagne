import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const { page = 1, limit = 10, category, tag, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        const query = { published: true };

        if (category) {
            query.categories = category;
        }

        if (tag) {
            query.tags = tag;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Get published blogs with pagination
        const blogs = await Blog.find(query)
            .populate('author', 'name email')
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-content'); // Exclude full content from listing

        // Get total count for pagination
        const total = await Blog.countDocuments(query);

        res.status(200).json({
            blogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ message: 'Error fetching blogs', error: error.message });
    }
}

