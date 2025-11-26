import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowLeft, Share2 } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';
import '../../styles/blog.css';

export default function BlogPost({ blog: initialBlog }) {
    const router = useRouter();
    const { slug } = router.query;
    const [blog, setBlog] = useState(initialBlog);
    // Only show loading for client-side navigation, not SSR
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only fetch if we don't have initial data (client-side navigation)
        // This should rarely happen with SSR, but handle it gracefully
        if (slug && !initialBlog && !blog) {
            setLoading(true);
            fetchBlogPost();
        }
    }, [slug]);

    const fetchBlogPost = async () => {
        try {
            const response = await fetch(`/api/blog/${slug}`);
            if (response.ok) {
                const data = await response.json();
                setBlog(data);
            } else if (response.status === 404) {
                router.push('/blog');
            }
        } catch (error) {
            console.error('Error fetching blog post:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        if (!blog) return;
        if (navigator.share) {
            navigator.share({
                title: blog.title,
                text: blog.excerpt,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Lien copié dans le presse-papiers!');
        }
    };

    // With SSR, initialBlog should always be present
    // Only show loading for client-side navigation edge cases
    if (loading && !blog) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Chargement de l'article...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    // If no blog data at all (shouldn't happen with SSR), return 404
    if (!blog) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Article non trouvé</h1>
                        <Link href="/blog">
                            <Button>Retour au blog</Button>
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
    // Use metaTitle if set, otherwise use title with Jappuie appended for better SEO
    const metaTitle = blog.metaTitle || (blog.title.includes('Jappuie') ? blog.title : `${blog.title} | Jappuie`);
    const pageTitle = metaTitle.includes('Jappuie') ? metaTitle : `${metaTitle} - Jappuie`;
    const description = blog.metaDescription || blog.excerpt;
    const imageUrl = blog.featuredImage || `${baseUrl}/images/jappuie_logo.png`;

    return (
        <>
            <Head>
                <title>{pageTitle}</title>
                <meta name="title" content={pageTitle} />
                <meta name="description" content={description} />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="googlebot" content="index, follow" />
                <meta name="author" content={blog.author?.name || "Jappuie"} />
                <meta name="publisher" content="Jappuie" />
                <meta name="language" content="fr-CA" />
                <meta name="geo.region" content="CA-QC" />
                <meta name="geo.placename" content="Québec" />
                {blog.metaKeywords && blog.metaKeywords.length > 0 ? (
                    <meta name="keywords" content={blog.metaKeywords.join(', ')} />
                ) : (
                    <meta name="keywords" content={`${blog.title}, financement scolaire, Jappuie, Québec, campagne de financement, financement scolaire Québec, collecte de fonds école`} />
                )}
                <link rel="canonical" href={`${baseUrl}/blog/${blog.slug}`} />
                <meta name="news_keywords" content={`${blog.title}, financement scolaire, Jappuie, Québec`} />

                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:url" content={`${baseUrl}/blog/${blog.slug}`} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={imageUrl} />
                <meta property="og:site_name" content="Jappuie" />
                <meta property="og:locale" content="fr_CA" />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={imageUrl} />

                {/* Article structured data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "BlogPosting",
                            "headline": blog.title,
                            "name": pageTitle,
                            "description": blog.excerpt,
                            "url": `${baseUrl}/blog/${blog.slug}`,
                            "mainEntityOfPage": {
                                "@type": "WebPage",
                                "@id": `${baseUrl}/blog/${blog.slug}`
                            },
                            "image": imageUrl,
                            "datePublished": blog.publishedAt,
                            "dateModified": blog.updatedAt || blog.publishedAt,
                            "author": {
                                "@type": "Person",
                                "name": blog.author?.name || "Jappuie"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Jappuie",
                                "url": baseUrl,
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": `${baseUrl}/images/jappuie_logo.png`
                                }
                            },
                            "keywords": blog.metaKeywords && blog.metaKeywords.length > 0
                                ? blog.metaKeywords.join(', ')
                                : `${blog.title}, financement scolaire, Jappuie, Québec`,
                            "inLanguage": "fr-CA",
                            "articleSection": blog.categories && blog.categories.length > 0 ? blog.categories[0] : "Financement scolaire",
                            "articleBody": blog.content ? blog.content.replace(/<[^>]*>/g, '').substring(0, 500) : blog.excerpt
                        })
                    }}
                />

                {/* Breadcrumb structured data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "Accueil",
                                    "item": baseUrl
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 2,
                                    "name": "Blog",
                                    "item": `${baseUrl}/blog`
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 3,
                                    "name": blog.title,
                                    "item": `${baseUrl}/blog/${blog.slug}`
                                }
                            ]
                        })
                    }}
                />
            </Head>
            <Layout>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Breadcrumbs for SEO */}
                        <nav aria-label="Breadcrumb" className="mb-6">
                            <ol className="flex items-center space-x-2 text-sm text-gray-600">
                                <li>
                                    <Link href="/" className="hover:text-blue-600">
                                        Accueil
                                    </Link>
                                </li>
                                <li>/</li>
                                <li>
                                    <Link href="/blog" className="hover:text-blue-600">
                                        Blog
                                    </Link>
                                </li>
                                <li>/</li>
                                <li className="text-gray-900 font-medium truncate max-w-md">
                                    {blog.title}
                                </li>
                            </ol>
                        </nav>

                        {/* Back button */}
                        <Link href="/blog">
                            <Button variant="ghost" className="mb-8">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Retour au blog
                            </Button>
                        </Link>

                        {/* Article Header */}
                        <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
                            <header className="mb-10">
                                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                                    {blog.title}
                                </h1>
                                <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-6 border-b border-gray-200">
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4 text-blue-600" />
                                            <span className="font-medium">
                                                {new Date(blog.publishedAt).toLocaleDateString('fr-CA', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                            <span className="font-medium">{blog.readingTime} min de lecture</span>
                                        </div>
                                        {blog.author && (
                                            <span className="font-medium">Par {blog.author.name}</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleShare}
                                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                    >
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Partager
                                    </Button>
                                </div>
                                {blog.featuredImage && (
                                    <div className="aspect-video w-full overflow-hidden rounded-xl mb-10 shadow-xl">
                                        <img
                                            src={blog.featuredImage}
                                            alt={`${blog.title} - Jappuie`}
                                            title={blog.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                            loading="eager"
                                            fetchPriority="high"
                                        />
                                    </div>
                                )}
                            </header>

                            {/* Article Content */}
                            <main className="blog-content mb-12" itemScope itemType="https://schema.org/Article">
                                <div
                                    dangerouslySetInnerHTML={{ __html: blog.content }}
                                />
                            </main>

                            {/* Categories and Tags */}
                            {(blog.categories?.length > 0 || blog.tags?.length > 0) && (
                                <div className="border-t-2 border-gray-200 pt-8 mt-12">
                                    {blog.categories?.length > 0 && (
                                        <div className="mb-6">
                                            <span className="text-sm font-bold text-gray-700 mr-3 mb-3 inline-block">Catégories:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {blog.categories.map((cat, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow"
                                                    >
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {blog.tags?.length > 0 && (
                                        <div>
                                            <span className="text-sm font-bold text-gray-700 mr-3 mb-3 inline-block">Tags:</span>
                                            <div className="flex flex-wrap gap-2">
                                                {blog.tags.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
                    </div>
                </div>
            </Layout>
        </>
    );
}

// Server-Side Rendering for SEO
export async function getServerSideProps(context) {
    const { slug } = context.params;

    // Ensure slug is available
    if (!slug) {
        return {
            notFound: true
        };
    }

    try {
        await dbConnect();

        const blog = await Blog.findOne({ slug, published: true })
            .populate('author', 'name email')
            .lean();

        if (!blog) {
            console.log(`Blog post not found for slug: ${slug}`);
            return {
                notFound: true
            };
        }

        // Convert MongoDB ObjectId and Date to strings for serialization
        // This is critical for SSR - all non-serializable values must be converted
        const serializedBlog = {
            ...blog,
            _id: blog._id.toString(),
            author: blog.author ? {
                ...blog.author,
                _id: blog.author._id.toString()
            } : null,
            publishedAt: blog.publishedAt ? blog.publishedAt.toISOString() : null,
            updatedAt: blog.updatedAt ? blog.updatedAt.toISOString() : null,
            createdAt: blog.createdAt ? blog.createdAt.toISOString() : null
        };

        // Log for debugging
        console.log(`SSR: Blog post found for slug: ${slug}, title: ${blog.title}`);

        // Ensure blog data is always returned for SSR
        // This guarantees Google sees the content immediately
        return {
            props: {
                blog: serializedBlog
            }
        };
    } catch (error) {
        console.error('Error fetching blog post in SSR:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            slug: slug
        });

        // Return notFound on error to show proper 404 page
        // This is better than showing loading state
        return {
            notFound: true
        };
    }
}

