// Dynamic sitemap generation for Next.js
import dbConnect from '@/lib/mongodb';
import Blog from '@/models/Blog';
import Store from '@/models/Store';
import Campaign from '@/models/Campaign';

function generateSiteMap(blogs = [], stores = []) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';

  // Static pages - all public pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' }, // Homepage
    { url: '/ecole', priority: '0.9', changefreq: 'weekly' }, // School landing
    { url: '/eleve', priority: '0.9', changefreq: 'weekly' }, // Student landing
    { url: '/fournisseur', priority: '0.9', changefreq: 'weekly' }, // Supplier landing
    { url: '/blog', priority: '0.9', changefreq: 'daily' }, // Blog index
    { url: '/inscription', priority: '0.8', changefreq: 'monthly' }, // Student registration
    { url: '/inscription-manager', priority: '0.8', changefreq: 'monthly' }, // School registration
    { url: '/inscription-supplier', priority: '0.8', changefreq: 'monthly' }, // Supplier registration
    { url: '/connexion', priority: '0.7', changefreq: 'monthly' }, // Login
    { url: '/mot-de-passe-oublie', priority: '0.5', changefreq: 'monthly' }, // Forgot password
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
           http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
     ${staticPages
      .map((page) => {
        return `
       <url>
           <loc>${baseUrl}${page.url}</loc>
           <lastmod>${new Date().toISOString()}</lastmod>
           <changefreq>${page.changefreq}</changefreq>
           <priority>${page.priority}</priority>
       </url>
     `;
      })
      .join('')}
     ${blogs
      .map((blog) => {
        const lastmod = blog.updatedAt || blog.publishedAt || new Date();
        return `
       <url>
           <loc>${baseUrl}/blog/${blog.slug}</loc>
           <lastmod>${new Date(lastmod).toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.7</priority>
       </url>
     `;
      })
      .join('')}
     ${stores
      .map((store) => {
        const lastmod = store.updatedAt || store.createdAt || new Date();
        return `
       <url>
           <loc>${baseUrl}/${store.slug}</loc>
           <lastmod>${new Date(lastmod).toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.6</priority>
       </url>
     `;
      })
      .join('')}
   </urlset>
 `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
  return null;
}

export async function getServerSideProps({ res }) {
  try {
    await dbConnect();

    // Fetch all published blog posts
    const blogs = await Blog.find({ published: true })
      .select('slug updatedAt publishedAt')
      .sort({ publishedAt: -1 })
      .lean();

    // Fetch all stores with slugs
    // Include all stores that have slugs, regardless of campaign status
    // This ensures all public store pages are indexed
    const stores = await Store.find({
      slug: { $exists: true, $ne: null, $ne: '' }
    })
      .select('slug updatedAt createdAt campaignId')
      .sort({ createdAt: -1 })
      .limit(1000) // Limit to prevent sitemap from being too large
      .lean();

    // Optional: Filter to only include stores from active campaigns if needed
    // But for better SEO, we include all stores with slugs
    // You can uncomment this if you only want active campaign stores:
    /*
    const activeCampaigns = await Campaign.find({ isActive: true })
      .select('_id')
      .lean();
    const activeCampaignIds = activeCampaigns.map(c => c._id.toString());
    const stores = stores.filter(store => 
      store.campaignId && activeCampaignIds.includes(store.campaignId.toString())
    );
    */

    // We generate the XML sitemap with the posts data
    const sitemap = generateSiteMap(blogs, stores);

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    // we write the XML to the response
    res.write(sitemap);
    res.end();
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Fallback to sitemap without dynamic content if there's an error
    const sitemap = generateSiteMap([], []);
    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();
  }

  return {
    props: {},
  };
}

export default SiteMap;

