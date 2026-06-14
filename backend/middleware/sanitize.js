const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

/**
 * Input sanitization middleware stack.
 * - mongoSanitize: strips $ and . from keys to prevent NoSQL injection
 * - xssClean: sanitizes user input to prevent XSS attacks
 */
const sanitizeMiddleware = [
  mongoSanitize({ replaceWith: '_' }),
  xssClean(),
];

module.exports = sanitizeMiddleware;
