const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
});

module.exports = withPWA({
  reactStrictMode: false,
  output: 'export',
  images: {
    unoptimized: true,
  },
  compiler: { removeConsole: process.env.NODE_ENV === 'production' },
});
