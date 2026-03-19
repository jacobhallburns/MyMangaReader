/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/recommendation',
        permanent: false, 
      },
    ]
  },
}

module.exports = nextConfig