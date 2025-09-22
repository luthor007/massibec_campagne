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
  };
  
  // Use export instead of module.exports
  export default nextConfig;