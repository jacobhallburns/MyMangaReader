/** @type {import('next').NextConfig} */
// removed: async redirects() block — index.tsx now owns the landing redirect
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
