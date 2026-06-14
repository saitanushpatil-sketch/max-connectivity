const rateLimit = require('express-rate-limit');

// General API rate limiter: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down', code: 'RATE_LIMITED' },
});

// Auth rate limiter: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.', code: 'RATE_LIMITED' },
});

// OTP send rate limiter: 3 attempts per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Try again later.', code: 'RATE_LIMITED' },
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
