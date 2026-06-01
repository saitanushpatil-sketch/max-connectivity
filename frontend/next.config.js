/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: [
      'media.giphy.com', 'media0.giphy.com', 'media1.giphy.com',
      'media2.giphy.com', 'media3.giphy.com', 'media4.giphy.com',
      'lh3.googleusercontent.com', 'res.cloudinary.com',
    ],
  },
  reactStrictMode: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ]
    }]
  }
}
module.exports = nextConfig

