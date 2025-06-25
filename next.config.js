/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'output: export' to allow API routes to work
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: [
      'llamaindex',
      'onnxruntime-node',
      '@xenova/transformers',
      'pdf-parse',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native modules from webpack bundling
      config.externals = config.externals || []
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        '@xenova/transformers': 'commonjs @xenova/transformers',
        'sharp': 'commonjs sharp',
      })
    }
    
    // Handle native modules
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    })
    
    return config
  },
};

module.exports = nextConfig;