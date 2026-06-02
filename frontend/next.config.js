const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
});

module.exports = withPWA({
  reactStrictMode: false,
  output: 'standalone',
  images: {
    domains: [
      'media.giphy.com','media0.giphy.com','media1.giphy.com',
      'media2.giphy.com','media3.giphy.com','media4.giphy.com',
      'lh3.googleusercontent.com','res.cloudinary.com'
    ],
  },
  compiler: { removeConsole: process.env.NODE_ENV === 'production' },
});
