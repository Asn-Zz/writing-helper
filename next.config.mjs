/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    middleware: true,
  },
}

export default nextConfig 