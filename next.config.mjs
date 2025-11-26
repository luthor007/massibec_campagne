/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable SWC minification
  swcMinify: false,

  images: {
    domains: ['res.cloudinary.com'],
  },

  // Custom webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.minimizer = config.optimization.minimizer.map((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            output: {
              ascii_only: true,
            },
          };
        }
        return minimizer;
      });
    }
    return config;
  },

  // SEO: Add trailing slash handling
  trailingSlash: false,

  // SEO: Add headers for better SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()'
          }
        ],
      },
    ];
  },

  // SEO: Redirects for better URL structure
  async redirects() {
    return [
      // Add any URL redirects here if needed
      // Example:
      // {
      //   source: '/old-page',
      //   destination: '/new-page',
      //   permanent: true,
      // },
    ];
  },
};

// Use export instead of module.exports
export default nextConfig;
