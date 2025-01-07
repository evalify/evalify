const nextConfig = {
  /* config options here */
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '172.17.9.74',
        port: '9002',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // webpack: (config, { dev, isServer }) => {
  //   if (!dev) {
  //     config.hot = false;
  //   }
  //   return config;
  // },

  // // Optimize production settings
  // reactStrictMode: true,
  // productionBrowserSourceMaps: false,

  // compress: true,

  // // Disable font preloading
  // experimental: {
  //   optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  // },

  // // Configure headers to prevent unnecessary preloading
  // async headers() {
  //   return [
  //     {
  //       source: '/_next/static/media/:path*',
  //       headers: [
  //         {
  //           key: 'Cache-Control',
  //           value: 'public, max-age=31536000, immutable',
  //         },
  //         {
  //           key: 'Link',
  //           value: '</_next/static/media/e11418ac562b8ac1-s.p.woff2>; rel=preload; as=font; type=font/woff2; crossorigin;',
  //         },
  //       ],
  //     },
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Link',
  //           // Remove preload directives that aren't immediately needed
  //           value: '',
  //         },
  //       ],
  //     },
  //   ]
  // },

  // Disable WebSocket in production
  // webSocketServer: false,
};

export default nextConfig;
