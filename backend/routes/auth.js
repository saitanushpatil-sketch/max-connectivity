// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
  sendSignupOTP,
  verifySignupOTP,
  signup,
  sendLoginOTP,
  loginVerify,
  googleAuth,
  getMe,
  updateProfile,
  ownerLogin,
  logout,
} = require('../controllers/authController');

// Public routes with rate limiting
router.post('/send-otp', otpLimiter, sendSignupOTP);
router.post('/verify-otp', authLimiter, verifySignupOTP);
router.post('/signup', authLimiter, signup);
router.post('/login-otp', otpLimiter, sendLoginOTP);
router.post('/login-verify', authLimiter, loginVerify);
router.post('/google', authLimiter, googleAuth);
router.post('/owner-login', authLimiter, ownerLogin);

// Authenticated routes
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.post('/logout', auth, logout);

module.exports = router;
