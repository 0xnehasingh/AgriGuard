/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables
  env: {
    WEATHERXM_API_KEY: process.env.WEATHERXM_API_KEY,
    WEATHERXM_API_URL: process.env.WEATHERXM_API_URL,
  },
  
  // Images configuration
  images: {
    domains: [
      'images.unsplash.com',
      'weatherxm.com',
      'api.weatherxm.com',
      'cdn.weatherxm.com',
      'via.placeholder.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
  
  // Rewrites for API routes (only if WEATHERXM_API_URL is defined)
  async rewrites() {
    const weatherXMUrl = process.env.WEATHERXM_API_URL;
    if (weatherXMUrl) {
      return [
        {
          source: '/api/weather/:path*',
          destination: `${weatherXMUrl}/:path*`,
        },
      ];
    }
    return [];
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/documentation',
        permanent: true,
      },
      {
        source: '/get-started',
        destination: '/insurance',
        permanent: true,
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack rules for handling external dependencies
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    // Fallback for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        util: false,
        querystring: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        buffer: require.resolve('buffer'),
      };
    }
    
    // Add plugins for Node.js polyfills
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );
    
    return config;
  },
  
  // Experimental features (updated for Next.js 14)
  experimental: {
    // Server components external packages
    serverComponentsExternalPackages: ['@prisma/client', 'near-api-js'],
  },
  
  // Output configuration
  output: 'standalone',
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Performance optimizations
  poweredByHeader: false,
  generateEtags: false,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Trailing slash configuration
  trailingSlash: false,
  
  // Basepath for deployment
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // Asset prefix for CDN
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
};

module.exports = nextConfig; 