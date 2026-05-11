/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@goldspire/api',
    '@goldspire/ui',
    '@goldspire/config',
    '@goldspire/auth',
    '@goldspire/blueprints',
    '@goldspire/db',
    '@goldspire/validation',
    '@goldspire/platform',
    '@goldspire/payments',
    '@goldspire/ai',
    '@goldspire/audit',
    '@goldspire/analytics',
    '@goldspire/feature-flags',
    '@goldspire/notifications',
    '@goldspire/chat',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
};

export default nextConfig;
