import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';

export default function BlogIndex({ initialBlogs, initialPagination, initialPage, initialSearchQuery }) {
    const router = useRouter();
    const [blogs, setBlogs] = useState(initialBlogs || []);
    const [loading, setLoading] = useState(false); // Only for client-side navigation
    const [page, setPage] = useState(initialPage || 1);
    const [pagination, setPagination] = useState(initialPagination || null);
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');

    // Only fetch on client-side if we don't have initial data or if search/page changes
    useEffect(() => {
        // Skip if we have SSR data and no search/page change
        if (initialBlogs && page === (initialPage || 1) && searchQuery === (initialSearchQuery || '')) {
            return;
        }

        // Only fetch if search or page changes (client-side navigation)
        if (page !== (initialPage || 1) || searchQuery !== (initialSearchQuery || '')) {
            fetchBlogs();
        }
    }, [page, searchQuery]);

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12'
            });
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            const response = await fetch(`/api/blog?${params}`);
            if (response.ok) {
                const data = await response.json();
                setBlogs(data.blogs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // Update URL for better SEO and client-side navigation
        const params = new URLSearchParams();
        if (searchQuery) {
            params.set('search', searchQuery);
        }
        router.push(`/blog${params.toString() ? `?${params.toString()}` : ''}`, undefined, { shallow: true });
        setPage(1);
    };

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
    const title = 'Blog - Jappuie | Conseils et actualités sur le financement scolaire';
    const description = 'Découvrez nos articles sur le financement scolaire, les campagnes de financement, et les meilleures pratiques pour les écoles, élèves et fournisseurs.';

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="keywords" content="financement scolaire, blog, conseils, campagnes de financement, école, élèves" />
                <link rel="canonical" href={`${baseUrl}/blog`} />

                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${baseUrl}/blog`} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
            </Head>
            <Layout>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                                Blog Jappuie
                            </h1>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Conseils, actualités et meilleures pratiques pour le financement scolaire
                            </p>
                        </div>

                        {/* Search */}
                        <form onSubmit={handleSearch} className="mb-8 max-w-2xl mx-auto">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Rechercher des articles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit">
                                    <Search className="h-4 w-4 mr-2" />
                                    Rechercher
                                </Button>
                            </div>
                        </form>

                        {/* Blog Grid */}
                        {loading && blogs.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Chargement des articles...</p>
                            </div>
                        ) : blogs.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">Aucun article trouvé.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                                    {blogs.map((blog) => (
                                        <Link key={blog._id} href={`/blog/${blog.slug}`}>
                                            <Card className="h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer">
                                                {blog.featuredImage && (
                                                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                                                        <img
                                                            src={blog.featuredImage}
                                                            alt={blog.title}
                                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                        />
                                                    </div>
                                                )}
                                                <CardContent className="p-6">
                                                    <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                                                        {blog.title}
                                                    </h2>
                                                    <p className="text-gray-600 mb-4 line-clamp-3">
                                                        {blog.excerpt}
                                                    </p>
                                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                {new Date(blog.publishedAt).toLocaleDateString('fr-CA')}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-4 w-4" />
                                                                {blog.readingTime} min
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex items-center text-blue-600 font-medium">
                                                        Lire la suite
                                                        <ArrowRight className="h-4 w-4 ml-2" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination && pagination.pages > 1 && (
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                        >
                                            Précédent
                                        </Button>
                                        <span className="flex items-center px-4">
                                            Page {page} sur {pagination.pages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            onClick={() => setPage(page + 1)}
                                            disabled={page >= pagination.pages}
                                        >
                                            Suivant
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Layout>
        </>
    );
}

// Server-Side Rendering for SEO
export async function getServerSideProps(context) {
    const { page = 1, limit = 12, search } = context.query;

    try {
        await dbConnect();

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        const query = { published: true };

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
            .select('-content') // Exclude full content from listing
            .lean();

        // Get total count for pagination
        const total = await Blog.countDocuments(query);

        // Serialize MongoDB data for SSR
        const serializedBlogs = blogs.map(blog => ({
            ...blog,
            _id: blog._id.toString(),
            author: blog.author ? {
                ...blog.author,
                _id: blog.author._id.toString()
            } : null,
            publishedAt: blog.publishedAt ? blog.publishedAt.toISOString() : null,
            updatedAt: blog.updatedAt ? blog.updatedAt.toISOString() : null,
            createdAt: blog.createdAt ? blog.createdAt.toISOString() : null
        }));

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        };

        return {
            props: {
                initialBlogs: serializedBlogs,
                initialPagination: pagination,
                initialPage: parseInt(page),
                initialSearchQuery: search || ''
            }
        };
    } catch (error) {
        console.error('Error fetching blogs in SSR:', error);
        // Return empty data instead of error to prevent loading state
        return {
            props: {
                initialBlogs: [],
                initialPagination: { page: 1, limit: 12, total: 0, pages: 0 },
                initialPage: 1,
                initialSearchQuery: ''
            }
        };
    }
}

